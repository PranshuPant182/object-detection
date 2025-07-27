
import React, { useEffect } from 'react';
import Images from '../Utils/Images';



const Loader = () => {

    useEffect(() => {
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = '';
        };
    }, []);
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/10 backdrop-blur-sm  z-50">
            <div className="flex flex-col items-center justify-center ">
                <img src={Images.Loader} alt="Loading..." className="w-28 h-28 mb-3" />
                <p className="text-white text-2xl font-semibold">Please Wait...</p>
            </div>
        </div>

    );
};

export default Loader;
