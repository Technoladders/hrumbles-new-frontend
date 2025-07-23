import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedWorkspaceId: null,
  selectedFileId: null,
  viewingMode: 'file', // New state: can be 'file' or 'unfiled'
};

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setSelectedWorkspace: (state, action) => {
      state.selectedWorkspaceId = action.payload;
      state.selectedFileId = null;
      state.viewingMode = 'file'; // Default to file view when workspace changes
    },
    setSelectedFile: (state, action) => {
      state.selectedFileId = action.payload;
      state.viewingMode = 'file'; // Viewing a specific file
    },
    // New action to view the unfiled contacts
    setViewUnfiled: (state) => {
        state.selectedWorkspaceId = null;
        state.selectedFileId = null;
        state.viewingMode = 'unfiled';
    },
    clearWorkspaceSelection: (state) => {
      state.selectedWorkspaceId = null;
      state.selectedFileId = null;
      state.viewingMode = 'file';
    }
  },
});

export const { setSelectedWorkspace, setSelectedFile, setViewUnfiled, clearWorkspaceSelection } = workspaceSlice.actions;
export default workspaceSlice.reducer;