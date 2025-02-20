import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import  supabase  from "../config/supabaseClient"; 

export const fetchClients = createAsyncThunk("clients/fetchClients", async () => {
  const { data, error } = await supabase.from("clients").select("*");
  if (error) throw error;
  return data;
});

export const addClient = createAsyncThunk("clients/addClient", async (client) => {
  const { error } = await supabase.from("clients").insert([client]);
  if (error) throw error;
  return client;
});

const clientSlice = createSlice({
  name: "clients",
  initialState: {
    clients: [],
    loading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => { state.loading = true; })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.clients = action.payload;
        state.loading = false;
      })
      .addCase(fetchClients.rejected, (state) => { state.loading = false; })
      .addCase(addClient.fulfilled, (state, action) => {
        state.clients.push(action.payload);
      });
  },
});

export default clientSlice.reducer;
