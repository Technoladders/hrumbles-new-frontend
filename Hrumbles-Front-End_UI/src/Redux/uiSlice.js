import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isSessionExpiredModalVisible: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    showSessionExpiredModal: (state) => {
      state.isSessionExpiredModalVisible = true;
    },
    hideSessionExpiredModal: (state) => {
      state.isSessionExpiredModalVisible = false;
    },
  },
});

export const { showSessionExpiredModal, hideSessionExpiredModal } = uiSlice.actions;

export default uiSlice.reducer;