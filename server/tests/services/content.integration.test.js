const {ai}=require('../support/isolatedDependencies');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {User,Space,District,Product,Blog}=require('../../app/api/v1/models');
const chat=require('../../app/api/v1/services/chatService');
const blogs=require('../../app/api/v1/services/aiBlogGeneratorService');
test('chat and blog content services with stored test data',{timeout:60000},async t=>{
    await require('../support/database').connect(t);
    const owner=await User.create({name:'Owner',email:'content@example.test'});
    const district=await District.create({name:'Test District',slug:'test-district'});
    const hub=await Space.create({name:'Test Hub',user_id:owner._id,rate_hour:150,district_id:district._id,capacity:10,occupied_seats:3,amenities:['WiFi']});
    for(const category of ['food','beverage','snacks','merch'])await Product.create({name:`Test ${category}`,space_id:hub._id,price:100,stock:5,category});
    await t.test('chat fetches scoped available data and builds room/menu context',async()=>{
        const districts=await chat.fetchDistricts(),spaces=await chat.fetchSpaces(),products=await chat.fetchProductsForSpace(hub._id);
        assert.equal(districts.length,1);assert.equal(spaces.length,1);assert.equal(products.length,4);
        assert.match(chat.buildSpaceContext(spaces,districts),/Test Hub/);
        const menu=chat.buildProductContext(products,'Test Hub');for(const category of ['food','beverage','snacks','merch'])assert.ok(menu.includes(`Test ${category}`));
        assert.match(chat.buildProductContext([]),/No products/);assert.deepEqual(await chat.fetchProductsForSpace(null),[]);
    });
    await t.test('chat successful replies keep session history and use scoped menu data',async st=>{
        let request;st.mock.method(ai.models,'generateContent',async input=>{request=input;return {text:'Test response'};});
        assert.equal(await chat.processMessage('show menu at Test Hub','session-test'),'Test response');
        assert.equal(chat.getSession('session-test').length,2);assert.match(request.config.systemInstruction,/Test food/);
        assert.deepEqual(chat.getSession('different-session'),[]);
    });
    await t.test('chat provider failures return a fallback without retaining an unanswered message',async st=>{
        st.mock.method(ai.models,'generateContent',async()=>{throw new Error('Provider unavailable');});
        const result=await chat.processMessage('hello','offline-test');assert.match(result,/trouble connecting/);assert.equal(chat.getSession('offline-test').length,0);
    });
    for(const period of ['week','month','quarter','year'])await t.test(`blog analytics and content for ${period}`,async st=>{
        st.mock.method(ai.models,'generateContent',async()=>({text:'<h1>Test report</h1>\n\n**Useful** information.\n\n- Detail'}));
        const data=await blogs.fetchAnalyticsData(period);assert.equal(data.totalSpaces,1);
        for(const type of ['weekly_insights','most_booked','top_rated']){
            const result=await blogs.generateBlogWithAI(data,type,'english',period);assert.equal(result.success,true);assert.match(result.content,/<strong>Useful<\/strong>/);assert.ok(result.slug.includes(period));
        }
    });
    await t.test('blog provider failure is explicit',async st=>{
        st.mock.method(ai.models,'generateContent',async()=>{throw new Error('Provider unavailable');});
        const data=await blogs.fetchAnalyticsData();const result=await blogs.generateBlogWithAI(data,'weekly_insights');assert.equal(result.success,false);assert.equal(result.error,'Provider unavailable');
    });
    await t.test('published blog reads filter drafts and update view counts',async()=>{
        await Blog.create({title:'Published',slug:'published-test',excerpt:'Test',content:'Test',status:'published'});
        await Blog.create({title:'Draft',slug:'draft-test',excerpt:'Test',content:'Test',status:'draft'});
        const listing=await blogs.getPublishedBlogs(10,1,'english');assert.equal(listing.total,1);assert.equal(listing.blogs[0].slug,'published-test');
        assert.equal(await blogs.getBlogBySlug('draft-test'),null);await blogs.getBlogBySlug('published-test');assert.equal((await Blog.findOne({slug:'published-test'})).views,1);
    });
});
