import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { 
    Calendar, Sofa, DoorOpen, Users, Clock, CheckCircle, 
    AlertCircle, Check, Loader2 
} from 'lucide-react';
import { getBookableName, getRatePerHour, getBookableCapacity } from '@/utils/spaceHelpers';

export const UserBookingModal = ({ 
    isOpen, 
    onClose, 
    space,
    rooms,
    selectedBookableType,
    setSelectedBookableType,
    selectedRoom,
    setSelectedRoom,
    bookingData,
    setBookingData,
    isOpenTime,
    setIsOpenTime,
    isClosedOnSelectedDate,
    isOutsideHours,
    spaceAvailable,
    roomAvailable,
    checkingAvailability,
    checkingSpaceAvailability,
    estimatedPrice,
    isBooking,
    handleConfirmBooking,
    isBookingDisabled,
    hasRooms,
    roomAvailability,
    spaceAvailability,
    getPHDateString
}) => {
    return (
        <Modal open={isOpen} onClose={onClose} title="Confirm Booking" size="xl" variant="light">
            {space && (
                <div className="space-y-5 py-2">
                    {/* Date Change Hint */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <Calendar size={12} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-blue-700 uppercase tracking-wider">💡 Pro Tip</p>
                            <p className="text-[8px] text-blue-600">
                                Change the <span className="font-bold">booking date</span> or <span className="font-bold">time</span> below to see real-time availability.
                            </p>
                        </div>
                    </div>

                    {/* Space/Room Selection Toggle */}
                    {hasRooms && (
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                            <button
                                onClick={() => {
                                    setSelectedBookableType('space');
                                    setSelectedRoom(null);
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${selectedBookableType === 'space'
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Sofa size={16} />
                                <span className="text-xs font-bold">Hot Desk / Open Area</span>
                            </button>
                            <button
                                onClick={() => setSelectedBookableType('room')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${selectedBookableType === 'room'
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <DoorOpen size={16} />
                                <span className="text-xs font-bold">Private Room</span>
                            </button>
                        </div>
                    )}

                    {/* Room Selection */}
                    {selectedBookableType === 'room' && rooms.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">
                                Select a Room
                            </label>
                            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                                {rooms.map((room) => {
                                    const availability = roomAvailability[room._id];
                                    const isAvailable = availability?.is_available !== false;
                                    return (
                                        <button
                                            key={room._id}
                                            onClick={() => isAvailable && setSelectedRoom(room)}
                                            disabled={!isAvailable}
                                            className={`p-3 rounded-xl border-2 text-left transition-all ${selectedRoom?._id === room._id
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : !isAvailable
                                                    ? 'border-red-200 bg-red-50 opacity-60 cursor-not-allowed'
                                                    : 'border-slate-100 hover:border-slate-200'
                                            }`}
                                        >
                                            <p className="font-bold text-sm text-slate-900 wrap-break-word">
                                                {room.name && room.name.length > 35 
                                                    ? room.name.substring(0, 32) + '...' 
                                                    : room.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Users size={10} className="text-slate-400" />
                                                <span className="text-[10px] text-slate-500">Up to {room.capacity}</span>
                                            </div>
                                            <p className="text-xs font-bold text-indigo-600 mt-1">₱{room.rate_hour}/hr</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Selected item info */}
                    <div className={`rounded-2xl p-4 ${isClosedOnSelectedDate
                        ? 'bg-red-50 border border-red-200'
                        : selectedBookableType === 'room' && selectedRoom && !roomAvailable
                            ? 'bg-red-50 border border-red-200'
                            : selectedBookableType === 'space' && !spaceAvailable
                                ? 'bg-red-50 border border-red-200'
                                : 'bg-linear-to-r from-indigo-50 to-purple-50'
                    }`}>
                        <h3 className="font-[1000] uppercase text-sm text-slate-900 wrap-break-word">
                            {getBookableName(selectedBookableType, selectedRoom, space).length > 50
                                ? getBookableName(selectedBookableType, selectedRoom, space).substring(0, 47) + '...'
                                : getBookableName(selectedBookableType, selectedRoom, space)}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] text-slate-500">₱{getRatePerHour(selectedBookableType, selectedRoom, space)}/hour</p>
                            <div className="flex items-center gap-1">
                                <Users size={10} className="text-slate-400" />
                                <p className="text-[10px] text-slate-500">Capacity: {getBookableCapacity(selectedBookableType, selectedRoom, space)}</p>
                            </div>
                        </div>

                        {isClosedOnSelectedDate && (
                            <div className="mt-2 flex items-center gap-1 text-red-600">
                                <AlertCircle size={12} />
                                <p className="text-[9px] font-bold">⚠️ Space is CLOSED on this date</p>
                            </div>
                        )}

                        {!isClosedOnSelectedDate && isOutsideHours && !isOpenTime && (
                            <div className="mt-2 flex items-center gap-1 text-amber-600">
                                <Clock size={12} />
                                <p className="text-[9px] font-bold">⚠️ Selected time is outside operating hours</p>
                            </div>
                        )}

                        {!isClosedOnSelectedDate && selectedBookableType === 'space' && spaceAvailable && (
                            <div className="mt-2 flex items-center gap-1 text-emerald-600">
                                <CheckCircle size={10} />
                                <p className="text-[8px] font-bold">✅ {spaceAvailability.available} seats available</p>
                            </div>
                        )}

                        {!isClosedOnSelectedDate && selectedBookableType === 'room' && selectedRoom && roomAvailable && (
                            <div className="mt-2 flex items-center gap-1 text-emerald-600">
                                <CheckCircle size={10} />
                                <p className="text-[8px] font-bold">✅ Available for your selected time</p>
                            </div>
                        )}
                    </div>

                    {/* Open Time Toggle */}
                    <div
                        onClick={() => !isClosedOnSelectedDate && setIsOpenTime(!isOpenTime)}
                        className={`flex items-center gap-4 p-5 rounded-3xl cursor-pointer transition-all border-2 ${isClosedOnSelectedDate ? 'opacity-50 cursor-not-allowed' : ''
                            } ${isOpenTime ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-transparent text-slate-600'
                        }`}
                    >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isOpenTime ? 'bg-indigo-500' : 'bg-white border border-slate-200'}`}>
                            {isOpenTime && <Check size={14} className="text-white" />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest italic">Open Time Booking</p>
                            <p className="text-[9px] font-bold opacity-60 uppercase">I will scan in/out whenever I arrive.</p>
                        </div>
                    </div>

                    {/* Date Picker */}
                    <div>
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Booking Date</label>
                            <span className="text-[8px] text-slate-400">📅 Select date to check availability</span>
                        </div>
                        <input
                            type="date"
                            min={getPHDateString()}
                            value={bookingData.date}
                            onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 outline-none text-sm font-bold text-slate-900"
                            disabled={isClosedOnSelectedDate}
                        />
                    </div>

                    {/* Time Selection */}
                    {!isOpenTime && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Start Time</label>
                                <input
                                    type="time"
                                    value={bookingData.start_time}
                                    onChange={(e) => setBookingData({ ...bookingData, start_time: e.target.value })}
                                    className="w-full mt-2 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 outline-none text-sm font-bold text-slate-900"
                                    disabled={isClosedOnSelectedDate}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">End Time</label>
                                <input
                                    type="time"
                                    value={bookingData.end_time}
                                    onChange={(e) => setBookingData({ ...bookingData, end_time: e.target.value })}
                                    className="w-full mt-2 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 outline-none text-sm font-bold text-slate-900"
                                    disabled={isClosedOnSelectedDate}
                                />
                                <p className="text-[7px] text-slate-400 mt-1 text-right">⏰ Change time to update availability</p>
                            </div>
                        </div>
                    )}

                    {/* Loading indicator */}
                    {(checkingAvailability || checkingSpaceAvailability) && (
                        <div className="flex items-center justify-center gap-2 p-2">
                            <Loader2 size={14} className="animate-spin text-indigo-500" />
                            <span className="text-[8px] text-slate-500">Checking availability...</span>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Special Notes</label>
                        <textarea
                            placeholder="Optional notes..."
                            value={bookingData.notes}
                            onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                            className="w-full mt-2 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:border-indigo-500 min-h-20 text-slate-900"
                            disabled={isClosedOnSelectedDate}
                        />
                    </div>

                    {/* Price Summary */}
                    {estimatedPrice > 0 && !isClosedOnSelectedDate && (
                        <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-slate-500">Estimated Total</span>
                                <span className="text-sm font-bold text-slate-900">₱{estimatedPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                <span className="text-xs font-black uppercase text-slate-900">Total to Pay</span>
                                <span className="text-xl font-[1000] italic text-indigo-600">₱{estimatedPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button onClick={onClose} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-slate-700">
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmBooking}
                            disabled={isBookingDisabled()}
                            className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg hover:bg-indigo-500 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isBooking ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Booking'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};