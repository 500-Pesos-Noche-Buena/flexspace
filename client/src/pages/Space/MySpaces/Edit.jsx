import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';
import CreateSpace from './Create';

const EditSpace = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [spaceData, setSpaceData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSpace = async () => {
            try {
                // console.log('Fetching space with ID:', id);
                // Use the correct endpoint - GET /space/spaces/:id
                const response = await apiGet(`/space/spaces/${id}`);
                // console.log('Response:', response);
                
                if (response && response.success) {
                    setSpaceData(response.data);
                    // console.log('Space data loaded:', response.data);
                } else {
                    showToast({ icon: 'error', title: 'Space not found' });
                    navigate('/space/my-spaces');
                }
            } catch (error) {
                console.error('Failed to fetch space:', error);
                showToast({ icon: 'error', title: error.message || 'Failed to fetch space' });
                navigate('/space/my-spaces');
            } finally {
                setLoading(false);
            }
        };
        
        if (id) {
            fetchSpace();
        } else {
            navigate('/space/my-spaces');
        }
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!spaceData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-white">Space not found</p>
                    <button 
                        onClick={() => navigate('/space/my-spaces')}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return <CreateSpace initialData={spaceData} isEditing={true} spaceId={id} />;
};

export default EditSpace;