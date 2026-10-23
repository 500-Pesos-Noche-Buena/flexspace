/**
 * Virtual Tour Data & Helpers for 360° Walkthroughs
 * Panorama images hosted securely via Cloudinary
 */

const CLOUDINARY_PANORAMAS = {
    entrance: 'https://res.cloudinary.com/dr8fedvjv/image/upload/v1792714202/coworking/panoramas/ulxmsg0iahwxvggqh1zi.jpg',
    entranceThumb: 'https://res.cloudinary.com/dr8fedvjv/image/upload/v1792714203/coworking/panoramas/jtyq5etgickytaq3e2cx.jpg',
    coworking: 'https://res.cloudinary.com/dr8fedvjv/image/upload/v1792714204/coworking/panoramas/pcirzcev852ilwoobsya.jpg',
    coworkingThumb: 'https://res.cloudinary.com/dr8fedvjv/image/upload/v1792714205/coworking/panoramas/ibx4qsbuzldk4izcqb5k.jpg',
    privateRoom: 'https://res.cloudinary.com/dr8fedvjv/image/upload/v1792714206/coworking/panoramas/zpohig4ozcpru8v3ysfm.jpg',
    privateRoomThumb: 'https://res.cloudinary.com/dr8fedvjv/image/upload/v1792714206/coworking/panoramas/qn9obcp37ah7x9ofnqdo.jpg'
};

export const SAMPLE_360_TOUR = {
    enabled: true,
    initial_node_id: 'node-entrance',
    nodes: [
        {
            id: 'node-entrance',
            name: 'Reception & Welcome Lounge',
            panorama: CLOUDINARY_PANORAMAS.entrance,
            thumbnail: CLOUDINARY_PANORAMAS.entranceThumb,
            caption: 'Main entrance and welcoming lounge area',
            default_pitch: 0,
            default_yaw: 0,
            default_zoom: 50,
            links: [
                {
                    nodeId: 'node-coworking',
                    pitch: -0.2,
                    yaw: 0.1,
                    tooltip: 'Step into Open Coworking Hall'
                }
            ],
            markers: [
                {
                    id: 'marker-reception',
                    pitch: -0.05,
                    yaw: -0.85,
                    tooltip: 'Front Desk & Guest Check-in',
                    html: '<div style="background: #4f46e5; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px;">🛎️ Reception Desk</div>'
                }
            ]
        },
        {
            id: 'node-coworking',
            name: 'Open Coworking Main Hall',
            panorama: CLOUDINARY_PANORAMAS.coworking,
            thumbnail: CLOUDINARY_PANORAMAS.coworkingThumb,
            caption: 'Dedicated hot desks & collaborative workspace',
            default_pitch: 0,
            default_yaw: 0,
            default_zoom: 50,
            links: [
                {
                    nodeId: 'node-entrance',
                    pitch: -0.2,
                    yaw: 3.14,
                    tooltip: 'Return to Reception & Lounge'
                },
                {
                    nodeId: 'node-room-dsadas',
                    pitch: -0.15,
                    yaw: 1.3,
                    tooltip: 'Enter Private Office: dsadas'
                }
            ],
            markers: [
                {
                    id: 'marker-desks',
                    pitch: -0.12,
                    yaw: 0.45,
                    tooltip: 'High-speed Fiber WiFi & Ergonomic Chairs',
                    html: '<div style="background: #059669; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px;">⚡ Hot Desks</div>'
                },
                {
                    id: 'marker-room-entry',
                    pitch: -0.02,
                    yaw: 1.3,
                    tooltip: 'Private Office: dsadas (Up to 10 pax)',
                    html: '<div style="background: #7c3aed; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px;">🚪 Private Office: dsadas</div>'
                }
            ]
        },
        {
            id: 'node-room-dsadas',
            name: 'Private Office: dsadas',
            panorama: CLOUDINARY_PANORAMAS.privateRoom,
            thumbnail: CLOUDINARY_PANORAMAS.privateRoomThumb,
            caption: 'Executive private office with AC & whiteboard',
            room_name: 'dsadas',
            default_pitch: 0,
            default_yaw: 0,
            default_zoom: 50,
            links: [
                {
                    nodeId: 'node-coworking',
                    pitch: -0.2,
                    yaw: -2.4,
                    tooltip: 'Exit to Open Coworking Hall'
                }
            ],
            markers: [
                {
                    id: 'marker-room-details',
                    pitch: 0,
                    yaw: -0.3,
                    tooltip: 'Capacity: 10 pax • ₱200/hr • Air Conditioned',
                    html: '<div style="background: #9333ea; color: white; padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px;">⭐ dsadas Suite (10 Pax)</div>'
                }
            ]
        }
    ]
};

/**
 * Returns the effective virtual tour object for a space, supporting dynamic database tour data
 * with graceful fallback to sample tour for demo space.
 */
export const getEffectiveVirtualTour = (space, spaceId) => {
    if (space?.virtual_tour?.nodes && Array.isArray(space.virtual_tour.nodes) && space.virtual_tour.nodes.length > 0) {
        return space.virtual_tour;
    }
    const targetId = spaceId || space?._id;
    if (String(targetId) === '6a9f646bf7d2bb36ddfe6872') {
        return SAMPLE_360_TOUR;
    }
    return space?.virtual_tour || null;
};
