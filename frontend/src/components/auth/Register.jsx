import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, Brain } from 'lucide-react';

function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    // Validate username (only alphabets and digits)
    useEffect(() => {
        if (username && !/^[a-zA-Z0-9]+$/.test(username)) {
            setUsernameError('Username can only contain letters and numbers');
        } else {
            setUsernameError('');
        }
    }, [username]);

    // Validate password
    useEffect(() => {
        if (password) {
            if (password.length < 8) {
                setPasswordError('Password must be at least 8 characters long');
            } else if (!/[A-Z]/.test(password)) {
                setPasswordError('Password must contain at least one uppercase letter');
            } else if (!/[a-z]/.test(password)) {
                setPasswordError('Password must contain at least one lowercase letter');
            } else if (!/[0-9]/.test(password)) {
                setPasswordError('Password must contain at least one number');
            } else {
                setPasswordError('');
            }
        } else {
            setPasswordError('');
        }
    }, [password]);

    async function handleSubmit(e) {
        e.preventDefault();

        // Check for validation errors
        if (usernameError || passwordError) {
            setError('Please fix the validation errors before submitting');
            return;
        }

        if (password !== passwordConfirm) {
            return setError('Passwords do not match');
        }

        try {
            setError('');
            setLoading(true);
            // Ensure all values are strings
            await signup(String(username), String(email), String(password));
            
            // Set success message and redirect to login after a short delay
            setSuccess('Account created successfully! Redirecting to login...');
            
            setTimeout(() => {
                navigate('/login');
            }, 2000);
            
        } catch (err) {
            setError('Failed to create an account: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    }

    // Render success message if registration was successful
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
                    <div className="text-center">
                        <Brain size={48} className="mx-auto text-blue-600 mb-4" />
                        <h2 className="mt-2 text-3xl font-extrabold text-gray-900">Success!</h2>
                        <p className="mt-2 text-sm text-gray-600">{success}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Brain size={48} className="text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800">AI Coach</h2>
                    <p className="text-gray-600 mt-2">Create your account</p>
                </div>
                
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                            Username
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User size={18} className="text-gray-500" />
                            </div>
                            <input
                                id="username"
                                type="text"
                                className={`pl-10 w-full p-3 border ${usernameError ? 'border-red-500' : 'border-gray-300'} rounded focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                placeholder="Username (letters and numbers only)"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        {usernameError && <p className="text-red-500 text-xs mt-1">{usernameError}</p>}
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail size={18} className="text-gray-500" />
                            </div>
                            <input
                                id="email"
                                type="email"
                                className="pl-10 w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock size={18} className="text-gray-500" />
                            </div>
                            <input
                                id="password"
                                type="password"
                                className={`pl-10 w-full p-3 border ${passwordError ? 'border-red-500' : 'border-gray-300'} rounded focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                placeholder="Password (min 8 chars, uppercase, lowercase, number)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password-confirm">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock size={18} className="text-gray-500" />
                            </div>
                            <input
                                id="password-confirm"
                                type="password"
                                className={`pl-10 w-full p-3 border ${password !== passwordConfirm && passwordConfirm ? 'border-red-500' : 'border-gray-300'} rounded focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                placeholder="Confirm password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                required
                            />
                        </div>
                        {password !== passwordConfirm && passwordConfirm && 
                            <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                        }
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading || usernameError || passwordError}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center disabled:bg-blue-300"
                    >
                        <UserPlus size={18} className="mr-2" />
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>
                
                <div className="mt-6 text-center text-gray-700">
                    Already have an account?{' '}
                    <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                        Log In
                    </Link>
                </div>
                
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>By signing up, you agree to our Terms of Service and Privacy Policy</p>
                </div>
            </div>
        </div>
    );
}

export default Register;
