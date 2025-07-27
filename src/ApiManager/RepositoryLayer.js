import { apiService } from './ApiService';

// Login API
class AuthRepository {
    async login(userData) {
        try {
            return await apiService.post(`/Login`, userData);
        } catch (error) {
            console.error("Login Failed:", error);
            throw error;
        }
    }
}

// Activity API
class ActivityRepository {
    async getActivityList(flightId,AirportId) {
        try {
            return await apiService.post(`/GetActivityList?FlightId=${flightId}&AirportId=${AirportId}`);
        } catch (error) {
            console.error("Get Activity Failed:", error);
            throw error;
        }
    }

    async saveActivity(requestBody) {
        try {
            return await apiService.post(`/SaveActivityInstences`, requestBody);
        } catch (error) {
            console.error("Save Activity Failed:", error);
            throw error;
        }
    }

    async saveActivityImage(requestBody) {
        try {
            return await apiService.post(`/SaveActivityImages`, requestBody)
        } catch (error) {
            console.log("Save Activity Image:", error);
            throw error;
        }
    }
}

// Flight API
class FlightRepository {
    async getFlightListByDate(date, AirportCode) {
        try {
            return await apiService.post(`/GetFlightListByDate?Date=${date}&AirportCode=${AirportCode}`);
        } catch (error) {
            console.error("Flight Detail Failed:", error);
            throw error;
        }
    }
}





export const authRepository = new AuthRepository();
export const activityRepository = new ActivityRepository();
export const flightRepository = new FlightRepository();