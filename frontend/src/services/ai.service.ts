import axios from "axios";
const aiApi = axios.create({ baseURL: "/api", timeout: 30000 });
export const aiService = {
  getInsights: (d:any) => aiApi.post("/ai/insights", d),
  getSavingsTips: (d:any) => aiApi.post("/ai/savings-tips", d),
  getBudgetAdvice: (d:any) => aiApi.post("/ai/budget-advice", d),
  getCarbonInsights: (d:any) => aiApi.post("/ai/carbon-insights", d),
  getMonthlyReview: (d:any) => aiApi.post("/ai/monthly-review", d),
  getSubscriptionAdvice: (d:any) => aiApi.post("/subscriptions/advice", d),
  scanReceipt: (file:File) => { const f = new FormData(); f.append("receipt", file); return aiApi.post("/receipt/scan", f); },
  getExchangeRates: (base="EUR") => aiApi.get(`/exchange-rates?base=${base}`),
};
