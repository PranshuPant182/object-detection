import React, { useState, useContext } from 'react'
import Images from '../Utils/Images'
import { LogOut, Camera, Video } from 'lucide-react';
import ConfirmationPopup from './Confirmationpopup';
import { AuthContext } from '../Authentication/AuthProvider';
import moment from 'moment';
import { useFlightContext } from '../Context/FlightContext';

function Navbar() {
  const { logout } = useContext(AuthContext);
  const [confirmationPopup, setConfirmationPopup] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { setSelectedOption, allActivitiesCompleted, FlightDate, selectedOption } = useFlightContext();

  const handleSourceSelection = (value) => {
    setSelectedOption(value);
    setDropdownOpen(false);
  }

  const handleLogout = () => {
    logout();
  }

  return (
    <div className='h-12 flex flex-row justify-between items-center space-x-2 sm:space-x-10 max-w-screen border-b border-[#bfaeae]/50 px-2 sm:px-10'>
      <div className='flex h-full space-x-2 sm:space-x-10'>
        <div className='text-white h-full flex flex-row justify-center items-center font-medium border-b-2 border-b-[#00f6ff]'>
          <span className='pr-2'><img src={Images.Operation} className='w-5 h-5' /></span>
          <span className='hidden md:inline'>Operations</span>
        </div>
      </div>
      
      <div className='flex h-full items-center justify-center space-x-2 sm:space-x-10 text-white font-medium'>
        {/* Date */}
        <div className="text-xs sm:text-sm md:text-base text-[#08E9FC] font-medium whitespace-nowrap">
          {moment(FlightDate).format('dddd, DD MMM YYYY')}
        </div>

        {/* Dropdown for larger screens */}
        <select
          className='font-medium disabled:cursor-not-allowed cursor-pointer bg-transparent text-white'
          onChange={(e) => handleSourceSelection(e.target.value)}
          value={selectedOption}
        >
          <option value="Camera" className='text-black'>Camera</option>
          <option value="Video" className='text-black'>Video</option>
        </select>

        {/* Custom dropdown for small screens */}
        <div className='relative sm:hidden'>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className='flex items-center gap-1 px-2 py-1 rounded border border-[#bfaeae]/50 hover:border-[#08E9FC] transition-colors'
          >
            {selectedOption === 'Video' ? <Video size={16} /> : <Camera size={16} />}
            <svg className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {dropdownOpen && (
            <div className='absolute right-0 mt-1 w-24 bg-gray-800 border border-[#bfaeae]/50 rounded shadow-lg z-50'>
              <button
                onClick={() => handleSourceSelection('Camera')}
                className={`w-full px-3 py-2 text-left hover:bg-gray-700 flex items-center gap-2 ${selectedOption === 'Camera' ? 'bg-gray-700 text-[#08E9FC]' : ''}`}
              >
                <Camera size={14} />
                <span className='text-sm'>Camera</span>
              </button>
              <button
                onClick={() => handleSourceSelection('Video')}
                className={`w-full px-3 py-2 text-left hover:bg-gray-700 flex items-center gap-2 ${selectedOption === 'Video' ? 'bg-gray-700 text-[#08E9FC]' : ''}`}
              >
                <Video size={14} />
                <span className='text-sm'>Video</span>
              </button>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className='flex items-center gap-2 cursor-pointer' onClick={() => setConfirmationPopup(true)}>
          <LogOut size={18} />
          <span className='text-sm hidden sm:inline'>Logout</span>
        </div>
      </div>
      
      {/* Click outside to close dropdown */}
      {dropdownOpen && (
        <div 
          className='fixed inset-0 z-40 sm:hidden' 
          onClick={() => setDropdownOpen(false)}
        />
      )}

      {confirmationPopup && (
        <ConfirmationPopup
          title={"Do you really want to log out?"}
          onClose={() => setConfirmationPopup(false)}
          onSuccess={() => { setConfirmationPopup(false); handleLogout() }}
        />
      )}
    </div>
  )
}

export default Navbar