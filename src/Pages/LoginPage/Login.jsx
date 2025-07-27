// import {useState, useContext } from 'react'
// import '../../index.css';
// import { useForm } from 'react-hook-form'
// import { Eye, EyeOff } from 'lucide-react';
// import { Link,  useNavigate } from 'react-router-dom';
// import toast from 'react-hot-toast';
// import { encryptGCM } from '../../Utils/encryption';
// import { AuthContext } from '../../Authentication/AuthProvider.jsx';
// import { authRepository } from '../../ApiManager/RepositoryLayer.js';

// function Login() {
//     const { login } = useContext(AuthContext);
//     const navigate = useNavigate();
//     const { register, handleSubmit, formState: { errors } } = useForm();
//     const [loading, setLoading] = useState(false);
//     const [ShowPassword, SetShowPassword] = useState(false);

//     const onSubmit = async (data) => {
//         try {
//             setLoading(true);
//             const encryptedUsername = await encryptGCM(data?.username);
//             const encryptedPassword = await encryptGCM(data?.password);

//             const userLoginData = {
//                 userName: "",
//                 password: "",
//                 usernameTag: encryptedUsername.tag,
//                 usernameNounce: encryptedUsername.ciphertext,
//                 passwordTag: encryptedPassword.tag,
//                 passwordNounce: encryptedPassword.ciphertext,
//                 deviceId: "",
//                 appVersion: "",
//                 location: "",
//                 token: "",
//             }

//             const response = await authRepository.login(userLoginData)

//             if (response?.result?.token) {
//                 login(response.result.token);
//                 localStorage.setItem('UserData', JSON.stringify(response.result));
//                 navigate('/dashboard');
//             } else {
//                 toast.error("Login failed");
//             }

//         } catch (error) {
//             toast.error(error.message || 'Login failed');
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className="flex items-center justify-center h-screen dashboard-Img relative overflow-hidden px-4">
//             <div className="absolute w-[300px] h-[300px] bg-[#ff3c72] opacity-20 blur-3xl top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0"></div>
//             <div className="absolute w-[300px] h-[300px] bg-[#3c82ff] opacity-20 blur-3xl bottom-1/3 left-1/2 -translate-x-1/2 translate-y-1/2 z-0"></div>

//             <div className="relative z-10 w-full max-w-sm rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 p-8 shadow-xl">
//                 <h1 className="text-3xl font-bold text-center text-white mb-6">Login</h1>

//                 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//                     {/* Username */}
//                     <div>
//                         <label htmlFor="username" className="text-white text-sm mb-1 block">
//                             Username <span className="text-red-400">*</span>
//                         </label>
//                         <input
//                             type="text"
//                             id="username"
//                             className={`w-full bg-white/10 text-white p-3 rounded-xl border focus:outline-none placeholder-gray-300 focus:ring-2 focus:ring-cyan-400 transition ${errors.username ? 'border-red-500' : 'border-white/20'}`}
//                             placeholder="Enter username"
//                             {...register('username', {
//                                 value:"Kavitech",
//                                 required: 'Username is required',
//                                 validate: value => value.trim() !== '' || 'Username cannot be empty'
//                             })}
//                         />
//                         {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
//                     </div>

//                     {/* Password */}
//                     <div className="relative">
//                         <label htmlFor="password" className="text-white text-sm mb-1 block">
//                             Password <span className="text-red-400">*</span>
//                         </label>
//                         <input
//                             type={ShowPassword ? 'text' : 'password'}
//                             id="password"
//                             className={`w-full bg-white/10 text-white p-3 pr-10 rounded-xl border focus:outline-none placeholder-gray-300 focus:ring-2 focus:ring-cyan-400 transition ${errors.password ? 'border-red-500' : 'border-white/20'}`}
//                             placeholder="Enter Password"
//                             {...register('password', {
//                                 value:"123",
//                                 required: 'Password is required',
//                                 validate: value => value.trim() !== '' || 'Password cannot be empty'
//                             })}
//                         />
//                         <div
//                             className="absolute right-3 top-9 cursor-pointer text-white/70"
//                             onClick={() => SetShowPassword(!ShowPassword)}
//                         >
//                             {ShowPassword ? <EyeOff size={20} /> : <Eye size={20} />}
//                         </div>
//                         {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
//                     </div>

//                     {/* Remember me + Forgot */}
//                     <div className="flex items-center justify-between text-sm text-white">
//                         <label className="flex items-center gap-2">
//                             <input type="checkbox" className="form-checkbox accent-cyan-400" />
//                             Remember me
//                         </label>
//                         <Link to="" className="hover:underline text-cyan-300">
//                             Forgot Password?
//                         </Link>
//                     </div>

//                     {/* Submit */}
//                     <button
//                         type="submit"
//                         disabled={loading}
//                         className="w-full cursor-pointer bg-gradient-to-r from-[#b62d2d] to-[#8c2020] text-white font-semibold py-2 rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                         {loading ? 'Please wait...' : 'Login'}
//                     </button>
//                 </form>
//             </div>
//         </div>
//     )
// }

// export default Login



import {useState, useContext, useEffect } from 'react' // Add useEffect
import '../../index.css';
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react';
import { Link,  useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { encryptGCM } from '../../Utils/encryption';
import { AuthContext } from '../../Authentication/AuthProvider.jsx';
import { authRepository } from '../../ApiManager/RepositoryLayer.js';
import { useGlobalModel } from '../../providers/ModelProvider.jsx'; // Add this import

function Login() {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [ShowPassword, SetShowPassword] = useState(false);

    // Add model initialization
    const {
        isModelReady,
        modelStatus,
        loadingProgress,
        initializeModel
    } = useGlobalModel();

    // Start model initialization when login page loads
    useEffect(() => {
        console.log('🚀 Starting model initialization on login page...');
        initializeModel();
    }, [initializeModel]);

    const onSubmit = async (data) => {
        try {
            setLoading(true);
            const encryptedUsername = await encryptGCM(data?.username);
            const encryptedPassword = await encryptGCM(data?.password);

            const userLoginData = {
                userName: "",
                password: "",
                usernameTag: encryptedUsername.tag,
                usernameNounce: encryptedUsername.ciphertext,
                passwordTag: encryptedPassword.tag,
                passwordNounce: encryptedPassword.ciphertext,
                deviceId: "",
                appVersion: "",
                location: "",
                token: "",
            }

            const response = await authRepository.login(userLoginData)

            if (response?.result?.token) {
                login(response.result.token);
                localStorage.setItem('UserData', JSON.stringify(response.result));
                
                // Log model status when navigating to dashboard
                console.log('🎯 Navigating to dashboard, model ready:', isModelReady);
                navigate('/dashboard');
            } else {
                toast.error("Login failed");
            }

        } catch (error) {
            toast.error(error.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    // Helper function for model status
    const getModelStatusText = () => {
        if (modelStatus.error) return `AI Error: ${modelStatus.error}`;
        if (isModelReady) return 'AI Model Ready ✅';
        if (modelStatus.isWarmingUp) return 'Warming up AI...';
        if (modelStatus.isLoading) return 'Loading AI model...';
        if (modelStatus.tfReady === false) return 'Initializing AI...';
        return 'Preparing AI...';
    };

    return (
        <div className="flex items-center justify-center h-screen dashboard-Img relative overflow-hidden px-4">
            <div className="absolute w-[300px] h-[300px] bg-[#ff3c72] opacity-20 blur-3xl top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0"></div>
            <div className="absolute w-[300px] h-[300px] bg-[#3c82ff] opacity-20 blur-3xl bottom-1/3 left-1/2 -translate-x-1/2 translate-y-1/2 z-0"></div>

            <div className="relative z-10 w-full max-w-sm rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 p-8 shadow-xl">
                <h1 className="text-3xl font-bold text-center text-white mb-6">Login</h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Username */}
                    <div>
                        <label htmlFor="username" className="text-white text-sm mb-1 block">
                            Username <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            id="username"
                            className={`w-full bg-white/10 text-white p-3 rounded-xl border focus:outline-none placeholder-gray-300 focus:ring-2 focus:ring-cyan-400 transition ${errors.username ? 'border-red-500' : 'border-white/20'}`}
                            placeholder="Enter username"
                            {...register('username', {
                                value:"Kavitech",
                                required: 'Username is required',
                                validate: value => value.trim() !== '' || 'Username cannot be empty'
                            })}
                        />
                        {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
                    </div>

                    {/* Password */}
                    <div className="relative">
                        <label htmlFor="password" className="text-white text-sm mb-1 block">
                            Password <span className="text-red-400">*</span>
                        </label>
                        <input
                            type={ShowPassword ? 'text' : 'password'}
                            id="password"
                            className={`w-full bg-white/10 text-white p-3 pr-10 rounded-xl border focus:outline-none placeholder-gray-300 focus:ring-2 focus:ring-cyan-400 transition ${errors.password ? 'border-red-500' : 'border-white/20'}`}
                            placeholder="Enter Password"
                            {...register('password', {
                                value:"123",
                                required: 'Password is required',
                                validate: value => value.trim() !== '' || 'Password cannot be empty'
                            })}
                        />
                        <div
                            className="absolute right-3 top-9 cursor-pointer text-white/70"
                            onClick={() => SetShowPassword(!ShowPassword)}
                        >
                            {ShowPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </div>
                        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                    </div>

                    {/* Remember me + Forgot */}
                    <div className="flex items-center justify-between text-sm text-white">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" className="form-checkbox accent-cyan-400" />
                            Remember me
                        </label>
                        <Link to="" className="hover:underline text-cyan-300">
                            Forgot Password?
                        </Link>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full cursor-pointer bg-gradient-to-r from-[#b62d2d] to-[#8c2020] text-white font-semibold py-2 rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Please wait...' : 'Login'}
                    </button>

                </form>
            </div>
        </div>
    )
}

export default Login