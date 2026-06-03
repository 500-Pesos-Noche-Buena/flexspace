// utils/spaceHelpers.js

export const getBookableName = (selectedBookableType, selectedRoom, space) => {
    if (selectedBookableType === 'room' && selectedRoom) {
        return selectedRoom.name;
    }
    return space?.name || 'Space';
};

export const getRatePerHour = (selectedBookableType, selectedRoom, space) => {
    if (selectedBookableType === 'room' && selectedRoom) {
        return selectedRoom.rate_hour;
    }
    return space?.rate_hour || 0;
};

export const getBookableCapacity = (selectedBookableType, selectedRoom, space) => {
    if (selectedBookableType === 'room' && selectedRoom) {
        return selectedRoom.capacity;
    }
    return space?.capacity || 0;
};

export const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
};

export const formatTimeToAMPM = (time) => {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};