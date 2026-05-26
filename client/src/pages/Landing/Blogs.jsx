import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/utils/Api';
import {
    Calendar, Eye, Heart, TrendingUp, Award, MapPin,
    Search, X, ChevronLeft, ChevronRight, Globe,
    Sparkles, Clock, User, Tag, Share2, Bookmark, ChevronDown, Star, Mail
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { showToast } from '@/components/ui/SweetAlert2';

const Blogs = () => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [language, setLanguage] = useState('english');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [featuredBlog, setFeaturedBlog] = useState(null);
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);

    const blogsPerPage = 6;

    // Language options
    const languages = [
        { code: 'english', name: 'English', flag: '🇬🇧', label: 'English' },
        { code: 'tagalog', name: 'Filipino', flag: '🇵🇭', label: 'Filipino' },
        { code: 'hiligaynon', name: 'Hiligaynon', flag: '💜', label: 'Hiligaynon' }
    ];

    // Category options
    const categories = [
        { id: 'all', name: 'All Posts', icon: <Sparkles size={14} /> },
        { id: 'weekly_insights', name: 'Weekly Insights', icon: <TrendingUp size={14} /> },
        { id: 'most_booked', name: 'Most Booked', icon: <Award size={14} /> },
        { id: 'top_revenue', name: 'Top Revenue', icon: <Award size={14} /> },
        { id: 'top_rated', name: 'Top Rated', icon: <Star size={14} /> }
    ];

    const fetchBlogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiGet(`/blogs?language=${language}&page=${currentPage}&limit=${blogsPerPage}`);
            if (res && res.success) {
                setBlogs(res.data?.blogs || []);
                setTotalPages(res.data?.totalPages || 1);

                // Set featured blog (first blog or highest viewed)
                if (res.data?.blogs?.length > 0 && !featuredBlog) {
                    setFeaturedBlog(res.data.blogs[0]);
                }
            } else {
                setBlogs([]);
                setTotalPages(1);
            }
        } catch (err) {
            console.error('Failed to fetch blogs:', err);
            setError(err.message || 'Failed to load blogs');
            setBlogs([]);
        } finally {
            setLoading(false);
        }
    }, [language, currentPage, featuredBlog]);

    useEffect(() => {
        fetchBlogs();
    }, [fetchBlogs]);

    const getLanguageLabel = (lang) => {
        const found = languages.find(l => l.code === lang);
        return found ? `${found.flag} ${found.label}` : '🇬🇧 English';
    };

    const getCategoryBadge = (category) => {
        const badges = {
            weekly_insights: { label: 'Weekly Insights', color: 'bg-indigo-100 text-indigo-700' },
            most_booked: { label: '🔥 Most Booked', color: 'bg-orange-100 text-orange-700' },
            top_revenue: { label: '💰 Top Revenue', color: 'bg-emerald-100 text-emerald-700' },
            top_rated: { label: '⭐ Top Rated', color: 'bg-amber-100 text-amber-700' },
            trending: { label: '📈 Trending', color: 'bg-purple-100 text-purple-700' }
        };
        return badges[category] || { label: category || 'Insights', color: 'bg-slate-100 text-slate-700' };
    };

    const formatDate = (date) => {
        if (!date) return 'Recent';
        try {
            return new Date(date).toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return 'Recent';
        }
    };

    const filteredBlogs = blogs.filter(blog => {
        const matchesSearch = searchTerm === '' ||
            (blog.title && blog.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (blog.excerpt && blog.excerpt.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategory === 'all' || blog.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Show error state
    if (error && blogs.length === 0) {
        return (
            <div className="min-h-screen bg-linear-to-b from-slate-50 to-white flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle size={32} className="text-red-500" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-2">Unable to Load Blogs</h2>
                    <p className="text-slate-500 mb-4">{error}</p>
                    <button
                        onClick={() => fetchBlogs()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (loading && blogs.length === 0) {
        return (
            <div className="min-h-screen bg-linear-to-b from-slate-50 to-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading insights...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-b from-slate-50 to-white">
            {/* Hero Section */}
            <div className="relative bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 text-white overflow-hidden">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
                    <div className="text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
                            <Sparkles size={14} className="text-yellow-300" />
                            <span className="text-xs font-bold uppercase tracking-wider">AI-Powered Insights</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 tracking-tighter">
                            FlexSpace<span className="text-yellow-300">Insights</span>
                        </h1>

                        <p className="text-indigo-100 text-lg md:text-xl mb-8 leading-relaxed">
                            Weekly AI-generated updates on coworking trends, top spaces, and community highlights
                        </p>

                        {/* Language Selector */}
                        <div className="relative inline-block">
                            <button
                                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all rounded-xl px-4 py-2 text-sm font-bold"
                            >
                                <Globe size={16} />
                                {getLanguageLabel(language)}
                                <ChevronDown size={14} />
                            </button>

                            {showLanguageMenu && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20 min-w-40">
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                setLanguage(lang.code);
                                                setShowLanguageMenu(false);
                                                setCurrentPage(1);
                                            }}
                                            className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center gap-2 ${language === lang.code
                                                    ? 'bg-indigo-50 text-indigo-600'
                                                    : 'hover:bg-slate-50 text-slate-700'
                                                }`}
                                        >
                                            <span className="text-base">{lang.flag}</span>
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        {/* Search Input */}
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search articles..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm bg-white"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Category Filter */}
                        <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto scrollbar-hide">
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${selectedCategory === category.id
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {category.icon}
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Featured Blog */}
            {featuredBlog && !searchTerm && selectedCategory === 'all' && (
                <div className="max-w-7xl mx-auto px-4 py-12">
                    <Link
                        to={`/blog/${featuredBlog.slug}`}
                        className="group block relative overflow-hidden rounded-3xl bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-xl hover:shadow-2xl transition-all duration-500"
                    >
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all"></div>
                        <div className="relative p-8 md:p-12">
                            <div className="max-w-2xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
                                        <Sparkles size={12} />
                                        Featured
                                    </span>
                                    <span className="text-white/80 text-sm">
                                        {formatDate(featuredBlog.published_at)}
                                    </span>
                                </div>

                                <h2 className="text-2xl md:text-4xl font-black mb-4 group-hover:translate-x-1 transition-transform line-clamp-2">
                                    {featuredBlog.title}
                                </h2>

                                <p className="text-indigo-100 text-base md:text-lg mb-6 line-clamp-2">
                                    {featuredBlog.excerpt}
                                </p>

                                <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1">
                                        <User size={14} /> {featuredBlog.author || 'FlexSpace AI'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Eye size={14} /> {featuredBlog.views || 0} views
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            )}

            {/* Blog Grid */}
            <div className="max-w-7xl mx-auto px-4 py-12">
                {filteredBlogs.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Search size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">No articles found</h3>
                        <p className="text-slate-500">Try adjusting your search or filter criteria</p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('all');
                            }}
                            className="mt-4 text-indigo-600 font-bold hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredBlogs.map((blog, index) => {
                            const category = getCategoryBadge(blog.category);
                            return (
                                <Link
                                    key={blog._id || index}
                                    to={`/blog/${blog.slug}`}
                                    className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div className="p-6">
                                        {/* Category Badge */}
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${category.color}`}>
                                                {category.label}
                                            </span>

                                            {/* Language Badge */}
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                {blog.language === 'hiligaynon' ? '💜' : blog.language === 'tagalog' ? '🇵🇭' : '🇬🇧'}
                                                {blog.language === 'hiligaynon' ? ' Hiligaynon' : blog.language === 'tagalog' ? ' Filipino' : ' English'}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-lg font-black text-slate-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                            {blog.title}
                                        </h3>

                                        {/* Excerpt */}
                                        <p className="text-slate-500 text-sm mb-4 line-clamp-3">
                                            {blog.excerpt}
                                        </p>

                                        {/* Meta Info */}
                                        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {formatDate(blog.published_at)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {Math.ceil((blog.content?.length || 500) / 1000)} min read
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center gap-1">
                                                    <Eye size={12} /> {blog.views || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-12">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-xl border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${currentPage === pageNum
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                : 'hover:bg-slate-100 text-slate-600'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-xl border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>

            {/* Newsletter Section */}
            <div className="bg-linear-to-r from-slate-900 to-slate-800 text-white py-16 mt-8">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
                        <Mail size={14} />
                        <span className="text-xs font-bold uppercase tracking-wider">Stay Updated</span>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-black mb-3">Never Miss an Insight</h2>
                    <p className="text-slate-300 mb-6 max-w-md mx-auto">
                        Get the latest coworking trends and updates delivered to your inbox weekly
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl">
                            Subscribe
                        </Button>
                    </div>
                    <p className="text-slate-400 text-xs mt-3">No spam, unsubscribe anytime.</p>
                </div>
            </div>
        </div>
    );
};

// AlertCircle component for error state
const AlertCircle = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

export default Blogs;