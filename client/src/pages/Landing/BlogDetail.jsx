import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiGet } from '@/utils/Api';
import { ArrowLeft, Calendar, Eye, Heart, User, Clock, Share2, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Button } from '@/components/ui/button';

const BlogDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [relatedBlogs, setRelatedBlogs] = useState([]);

    useEffect(() => {
        fetchBlog();
        window.scrollTo(0, 0);
    }, [slug]);

    const fetchBlog = async () => {
        setLoading(true);
        try {
            const res = await apiGet(`/blogs/${slug}`);
            if (res.success) {
                setBlog(res.data);
                // Fetch related blogs
                fetchRelatedBlogs(res.data.category, res.data.language);
            } else {
                showToast({ icon: 'error', title: 'Blog not found' });
                navigate('/blogs');
            }
        } catch (err) {
            console.error('Failed to fetch blog:', err);
            showToast({ icon: 'error', title: 'Failed to load blog' });
            navigate('/blogs');
        } finally {
            setLoading(false);
        }
    };

    const fetchRelatedBlogs = async (category, language) => {
        try {
            const res = await apiGet(`/blogs?language=${language}&limit=3`);
            if (res.success) {
                // Filter out current blog and same category
                const related = res.data.blogs.filter(b => b.slug !== slug && b.category === category);
                setRelatedBlogs(related.slice(0, 3));
            }
        } catch (err) {
            console.error('Failed to fetch related blogs:', err);
        }
    };

    const formatDate = (date) => {
        if (!date) return 'Recent';
        return new Date(date).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getCategoryBadge = (category) => {
        const badges = {
            weekly_insights: { label: '📊 Weekly Insights', color: 'bg-indigo-100 text-indigo-700' },
            most_booked: { label: '🔥 Most Booked', color: 'bg-orange-100 text-orange-700' },
            top_revenue: { label: '💰 Top Revenue', color: 'bg-emerald-100 text-emerald-700' },
            top_rated: { label: '⭐ Top Rated', color: 'bg-amber-100 text-amber-700' },
            insights: { label: '📈 Insights', color: 'bg-purple-100 text-purple-700' },
            trending: { label: '📈 Trending', color: 'bg-blue-100 text-blue-700' }
        };
        return badges[category] || { label: category || 'Insights', color: 'bg-slate-100 text-slate-700' };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading article...</p>
                </div>
            </div>
        );
    }

    if (!blog) return null;

    const category = getCategoryBadge(blog.category);
    const readingTime = Math.ceil((blog.content?.length || 1000) / 1000);

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-16">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative max-w-4xl mx-auto px-4 text-center">
                    <Link to="/blogs" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Blogs
                    </Link>
                    
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm`}>
                            {category.label}
                        </span>
                        <span className="text-white/80 text-sm flex items-center gap-1">
                            <Clock size={14} /> {readingTime} min read
                        </span>
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
                        {blog.title}
                    </h1>
                    
                    <div className="flex items-center justify-center gap-4 text-sm text-white/80">
                        <span className="flex items-center gap-1">
                            <User size={14} /> {blog.author}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar size={14} /> {formatDate(blog.published_at)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Eye size={14} /> {blog.views || 0} views
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Language Badge */}
                <div className="mb-8 flex justify-end">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                        {blog.language === 'hiligaynon' ? '💜 Hiligaynon' : blog.language === 'tagalog' ? '🇵🇭 Filipino' : '🇬🇧 English'}
                    </span>
                </div>

                {/* Blog Content */}
                <article className="prose prose-lg prose-indigo max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: blog.content }} />
                </article>

                {/* Tags */}
                {blog.tags && blog.tags.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <h3 className="text-sm font-black text-slate-900 mb-3">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                            {blog.tags.map((tag, idx) => (
                                <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Share Section */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-black text-slate-900 mb-3">Share this article</h3>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                showToast({ icon: 'success', title: 'Link copied!' });
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"
                        >
                            <Share2 size={16} /> Copy Link
                        </button>
                        <button
                            onClick={() => {
                                // Like functionality
                                showToast({ icon: 'success', title: 'Thanks for liking!' });
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"
                        >
                            <Heart size={16} /> Like
                        </button>
                    </div>
                </div>
            </div>

            {/* Related Blogs */}
            {relatedBlogs.length > 0 && (
                <div className="bg-slate-50 py-16">
                    <div className="max-w-7xl mx-auto px-4">
                        <h2 className="text-2xl font-black text-slate-900 mb-8 text-center">Related Articles</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {relatedBlogs.map((related) => (
                                <Link
                                    key={related._id}
                                    to={`/blog/${related.slug}`}
                                    className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div className="p-6">
                                        <h3 className="text-lg font-black text-slate-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                            {related.title}
                                        </h3>
                                        <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                                            {related.excerpt}
                                        </p>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {formatDate(related.published_at)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Eye size={12} /> {related.views || 0}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Back to Top Button */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="fixed bottom-6 right-6 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-500 transition-all z-50"
            >
                <ChevronUp size={20} />
            </button>
        </div>
    );
};

// ChevronUp component
const ChevronUp = ({ size }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
    </svg>
);

export default BlogDetail;