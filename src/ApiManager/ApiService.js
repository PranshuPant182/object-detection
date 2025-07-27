import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

// const DEV_API_URL = 'https://prod.kavitechworld.com/KyteTurnaroundAPINetCore/api'
const DEV_API_URL = 'https://kavitechworld.com/KyteRampVision360WebAPIDev/api'




class ApiService {
    constructor() {
        this.api = axios.create({
            baseURL: DEV_API_URL,
            timeout: 15000,
        });

        this.cancelSource = axios.CancelToken.source();
        this.isSessionTimedOut = false;

        // Adding an interceptor to handle request config or token attachment
        this.api.interceptors.request.use(
            (config) => {
                const token = Cookies.get('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                else if (config.data instanceof FormData) {
                    config.headers['Content-Type'] = 'multipart/form-data';
                } else {
                    config.headers['Content-Type'] = 'application/json';
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Adding response interceptor to handle errors globally
        this.api.interceptors.response.use(
            (response) => response,
            (error) => {
                return Promise.reject(this.handleError(error));
            }
        );
    }


    // Generic POST request
    async post(endpoint, data, timeout) {
        try {
            // Use custom timeout if provided, otherwise use the default timeout
            const response = await this.api.post(endpoint, data, {
                timeout: timeout || this.api.defaults.timeout, // Default timeout if no timeout is passed
            });
            return response.data;
        } catch (error) {
            console.log("error", error)
            throw error;
        }
    }

    // Error handling logic (can be customized)
    handleError(error) {
        if (axios.isCancel(error)) {
            return;
        }

        if (error.response) {
            const status = error.response.status;

            if (status === 401 && !this.isHandlingSessionTimeout) {
                this.cancelSource.cancel('Session timed out, canceling pending requests.');
                this.isHandlingSessionTimeout = true; // Block future calls until handled

                localStorage.clear();
                toast.error("Another user is already logged in with the same credentials.");
                setTimeout(() => {
                    window.location.href = '/EyeOnRampQA';
                }, 2000);
            } else if (status === 500) {
                // handle 500 errors here if needed
            } else {
                // handle other errors here if needed
            }
        } else if (error.request) {
            throw new Error('No response from server, Please try again!');
        } else {
            throw new Error(`Error in request: ${error.message}`);
        }
    }
}

export const apiService = new ApiService();