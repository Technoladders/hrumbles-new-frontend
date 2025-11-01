import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { hideSessionExpiredModal } from '../Redux/uiSlice';
import { logout } from '../Redux/authSlice'; // <-- Import your existing logout action

const SessionExpiredModal = () => {
  const isVisible = useSelector((state) => state.ui.isSessionExpiredModalVisible);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleRedirect = () => {
    // Dispatch your existing logout action. This is great because it
    // already handles clearing the Redux state and localStorage.
    dispatch(logout());

    // Hide the modal
    dispatch(hideSessionExpiredModal());

    // Redirect to the login page
    navigate('/login');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Session Expired</h2>
        <p className="text-gray-600 mb-6">
          Your session has ended. Please log in again to continue.
        </p>
        <button
          onClick={handleRedirect}
          className="w-full h-12 px-6 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
        >
          Login Again
        </button>
      </div>
    </div>
  );
};

export default SessionExpiredModal;