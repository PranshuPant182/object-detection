import { Toaster } from "react-hot-toast";
import Navbar from "../Components/Navbar";
import "../index.css";
import { FlightContext } from "../Context/FlightContext";

export default function Layout({ children, setSelectedOption, allActivitiesCompleted, FlightDate }) {
    return (
        <FlightContext.Provider value={{ setSelectedOption, allActivitiesCompleted, FlightDate }}>
            <div className="min-h-screen w-full relative overflow-x-hidden dashboard-Img">
                <main className="relative z-40">
                    <Toaster position="top-center" reverseOrder={false} />
                    <Navbar />
                    {children}
                </main>
            </div>
        </FlightContext.Provider>
    );
}
