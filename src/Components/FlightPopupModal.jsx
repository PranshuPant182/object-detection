import React, { useRef } from 'react';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import { CalendarDays, Search, X } from 'lucide-react';
import Images from '../Utils/Images'; // adjust this import if needed
import 'react-datepicker/dist/react-datepicker.css';
import '../index.css'

const FlightPopupModal = ({
    searchQuery,
    setSearchQuery,
    filteredFlights,
    handleManualFlightSelection,
    setFlightPopup,
    setSelectedDate,
    selectedDate
}) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/60 z-50 p-4">
            <div className="relative w-full max-w-[1100px] h-[90vh] sm:h-[80vh] p-4 sm:p-6 rounded-2xl shadow-2xl border border-cyan-400 bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl backdrop-saturate-150 flex flex-col">

                {/* Mobile Header Layout */}
                <div className="sm:hidden flex flex-col gap-3 mb-4">
                    {/* First Row: Date Selector (left half) + Close Button (right corner) */}
                    <div className="flex items-center justify-between gap-3">
                        {/* Date Selector - Half Width */}
                        <div className="relative flex items-center space-x-3 border border-[#00ffff] bg-[#1e1e1e] text-white px-3 py-2 rounded-lg shadow-md flex-1">
                            <CalendarDays size={18} className="pointer-events-none flex-shrink-0" />
                            
                            {/* DatePicker with custom input */}
                            <DatePicker
                                selected={selectedDate instanceof Date ? selectedDate : new Date(selectedDate)}
                                onChange={(date) => setSelectedDate(date)}
                                dateFormat="dd-MM-yyyy"
                                popperClassName="z-[60]"
                                popperPlacement="bottom-start"
                                customInput={
                                    <span className="text-sm cursor-pointer">
                                        {moment(selectedDate).format("DD-MM-YYYY")}
                                    </span>
                                }
                            />
                        </div>

                        {/* Close Button - Right Corner */}
                        <button
                            className="text-white bg-red-500 p-2 cursor-pointer rounded-full hover:bg-red-600 shadow-lg border-2 border-white flex-shrink-0"
                            onClick={() => setFlightPopup(false)}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Second Row: Search Input - Full Width */}
                    <div className="flex items-center border border-[#00ffff] bg-[#1e1e1e] px-3 py-2 rounded-lg shadow-md space-x-3 w-full">
                        <Search size={18} className="text-white flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Enter Flight Number"
                            className="bg-transparent text-white placeholder-gray-400 flex-1 outline-none text-sm w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Desktop Header Layout */}
                <div className="hidden sm:flex flex-row justify-between items-center mb-6 gap-4">
                    {/* Date Selector */}
                    <div className="relative flex items-center space-x-3 border border-[#00ffff] bg-[#1e1e1e] text-white px-4 py-2 rounded-lg shadow-md">
                        <CalendarDays size={18} className="pointer-events-none flex-shrink-0" />
                        
                        {/* DatePicker with custom input */}
                        <DatePicker
                            selected={selectedDate instanceof Date ? selectedDate : new Date(selectedDate)}
                            onChange={(date) => setSelectedDate(date)}
                            dateFormat="dd-MM-yyyy"
                            popperClassName="z-[60]"
                            popperPlacement="bottom-start"
                            customInput={
                                <span className="text-sm cursor-pointer">
                                    {moment(selectedDate).format("DD-MM-YYYY")}
                                </span>
                            }
                        />
                    </div>

                    {/* Search Input */}
                    <div className="flex items-center border border-[#00ffff] bg-[#1e1e1e] px-4 py-2 rounded-lg shadow-md space-x-3 flex-1 max-w-[600px]">
                        <Search size={18} className="text-white flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Enter Flight Number"
                            className="bg-transparent text-white placeholder-gray-400 flex-1 outline-none text-sm w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Close Button - Desktop */}
                    <button
                        className="text-black bg-[#cacaca] px-1 py-1 cursor-pointer rounded-full hover:bg-red-500 shadow-md flex-shrink-0"
                        onClick={() => setFlightPopup(false)}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Table Container */}
                <div className="overflow-hidden border min-h-[400px] sm:min-h-[450px]  rounded-xl flex flex-col">
                    {/* Table Header - Desktop */}
                    <div className="hidden sm:grid grid-cols-[1fr_2.2fr_0.8fr_0.8fr] bg-[#069aa0] rounded-lg text-white text-sm font-bold py-2 px-2 mb-1 flex-shrink-0">
                        <span className="text-center">Flight Number</span>
                        <span className="text-center">Destination</span>
                        <span className="text-center mr-2">STD</span>
                        <span className="text-center mr-2">ETD</span>
                    </div>

                    {/* Table Header - Mobile */}
                    <div className="sm:hidden grid grid-cols-[1fr_1fr_0.8fr] bg-[#069aa0] rounded-lg text-white text-sm font-bold py-2 px-2 mb-1 flex-shrink-0">
                        <span className="text-center">Flight</span>
                        <span className="text-center">Destination</span>
                        <span className="text-center">Time</span>
                    </div>

                    {/* Flight List */}
                    <div className="flex-1 overflow-y-auto custom-scroll bg-[#1b1b1b] min-h-0">
                        {filteredFlights.length > 0 ? (
                            filteredFlights.map((flight, index) => {
                                const flightNo = flight.flightNumber;
                                return (
                                    <div
                                        key={flight.flightId}
                                        onClick={() => handleManualFlightSelection(flight)}
                                        className={`cursor-pointer text-white mb-1 rounded-md shadow border border-[#9ba0ac] 
                                            ${index % 2 === 0 ? 'bg-[#252423]' : 'bg-[#3a4457]'}`}
                                    >
                                        {/* Desktop Layout */}
                                        <div className="hidden sm:grid grid-cols-[1fr_2.2fr_0.8fr_0.8fr] items-center px-2 py-2">
                                            <span className="font-semibold text-sm text-center">
                                                {flightNo ? `${flightNo.slice(0, 2)} ${flightNo.slice(2)}` : ''}
                                            </span>

                                            <div className="grid grid-cols-3 items-center text-sm text-center w-full">
                                                <span className="truncate">{flight.origin}</span>
                                                <img src={Images.Flight_takeOff} alt="flight path" className="h-4 mx-auto" />
                                                <span className="truncate">{flight.destination}</span>
                                            </div>

                                            <span className="text-gray-300 font-semibold text-sm text-center">
                                                {moment(flight.std, "HH:mm:ss").format("HH:mm")}
                                            </span>

                                            <span className="text-gray-300 font-semibold text-sm text-center">
                                                {moment(flight.etd, "HH:mm:ss").format("HH:mm")}
                                            </span>
                                        </div>

                                        {/* Mobile Layout */}
                                        <div className="sm:hidden grid grid-cols-[1fr_1fr_0.8fr] items-center px-2 py-3 gap-2">
                                            {/* Flight Number */}
                                            <div className="text-center">
                                                <span className="font-semibold text-sm">
                                                    {flightNo ? `${flightNo.slice(0, 2)} ${flightNo.slice(2)}` : ''}
                                                </span>
                                            </div>

                                            {/* Destination */}
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-1 text-xs">
                                                    <span className="truncate max-w-[50px]">{flight.origin}</span>
                                                    <img src={Images.Flight_takeOff} alt="flight path" className="h-3" />
                                                    <span className="truncate max-w-[50px]">{flight.destination}</span>
                                                </div>
                                            </div>

                                            {/* Time */}
                                            <div className="text-center">
                                                <div className="flex flex-col text-xs">
                                                    <span className="text-gray-300 font-semibold">
                                                        {moment(flight.std, "HH:mm:ss").format("HH:mm")}
                                                    </span>
                                                    <span className="text-gray-400 text-[10px]">STD</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-gray-400 h-full flex items-center justify-center text-sm">
                                No flights found
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlightPopupModal;