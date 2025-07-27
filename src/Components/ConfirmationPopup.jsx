import { OctagonAlert } from "lucide-react";
import "../index.css";

const ConfirmationPopup = ({ title, onClose, onSuccess }) => {

    return (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-opacity-50 overflow-y-auto z-50">
            <div className="bg-black-light rounded-2xl border border-yellow-200 bg-[#37383a]  px-6 py-10 relative flex flex-col md:flex-col max-h-[90vh] overflow-y-auto mx-2">
                <div className="flex items-center justify-center mb-6">
                    <OctagonAlert color="orange" className="mt-[2px]" />
                    <h2 className="text-xl ml-2 text-center text-white font-sans font-medium">{title}</h2>
                </div>

                <div className='flex flex-row justify-center items-center gap-4'>
                    <button
                        type="button"
                        className="bg-gray-600 hover:bg-gray-700 cursor-pointer text-white font-semibold py-2 px-4 rounded text-sm md:text-base transition"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="bg-yellow-400 hover:bg-yellow-500 cursor-pointer text-black font-semibold py-2 px-6 rounded text-sm md:text-base transition"
                        onClick={onSuccess}
                    >
                        {title === "Do you really want to log out?" ? 'Confirm' : 'Ok'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ConfirmationPopup;