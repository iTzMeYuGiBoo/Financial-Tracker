import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";
interface User { firstName:string; lastName:string; email:string; }
interface AuthState { user:User|null; token:string|null; loading:boolean; }
const initialState: AuthState = {
  user: (() => { try { return JSON.parse(localStorage.getItem("user")||"null"); } catch { return null; } })(),
  token: localStorage.getItem("token"),
  loading: false,
};
export const login = createAsyncThunk("auth/login", async (d:any, {rejectWithValue}) => {
  try { const r = await api.post("/auth/login", d); return r.data; } catch(e:any) { return rejectWithValue(e.response?.data?.error||"Login failed"); }
});
export const register = createAsyncThunk("auth/register", async (d:any, {rejectWithValue}) => {
  try { const r = await api.post("/auth/register", d); return r.data; } catch(e:any) { return rejectWithValue(e.response?.data?.error||"Register failed"); }
});
const authSlice = createSlice({
  name:"auth", initialState,
  reducers: { logout(state) { state.user=null; state.token=null; localStorage.removeItem("token"); localStorage.removeItem("user"); } },
  extraReducers: b => {
    b.addCase(login.pending, s=>{s.loading=true});
    b.addCase(login.fulfilled, (s,a)=>{ s.loading=false; s.token=a.payload.token; s.user={firstName:a.payload.firstName,lastName:a.payload.lastName,email:a.payload.email}; localStorage.setItem("token",a.payload.token); localStorage.setItem("user",JSON.stringify(s.user)); });
    b.addCase(login.rejected, s=>{s.loading=false});
    b.addCase(register.pending, s=>{s.loading=true});
    b.addCase(register.fulfilled, (s,a)=>{ s.loading=false; s.token=a.payload.token; s.user={firstName:a.payload.firstName,lastName:a.payload.lastName,email:a.payload.email}; localStorage.setItem("token",a.payload.token); localStorage.setItem("user",JSON.stringify(s.user)); });
    b.addCase(register.rejected, s=>{s.loading=false});
  }
});
export const { logout } = authSlice.actions;
export default authSlice.reducer;
