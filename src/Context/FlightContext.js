// FlightContext.js
import { createContext, useContext } from "react";

export const FlightContext = createContext();

export const useFlightContext = () => useContext(FlightContext);
