import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Home from './pages/Home'
import PropertiesList from './pages/RealEstate/PropertiesList'
import AddProperty from './pages/RealEstate/AddProperty'
import PropertyDetail from './pages/RealEstate/PropertyDetail'
import EditProperty from './pages/RealEstate/EditProperty'
import RecordSale from './pages/RealEstate/RecordSale'
import AddAcquisitionCost from './pages/RealEstate/AddAcquisitionCost'
import AddMaintenanceCost from './pages/RealEstate/AddMaintenanceCost'
import AddLease from './pages/RealEstate/AddLease'
import LeaseDetail from './pages/RealEstate/LeaseDetail'
import AddRentPayment from './pages/RealEstate/AddRentPayment'
import EditRentPayment from './pages/RealEstate/EditRentPayment'
import Analytics from './pages/RealEstate/Analytics'
import HoneyLayout from './pages/Honey/HoneyLayout'
import HoneyDashboard from './pages/Honey/HoneyDashboard'
import ApiariesList from './pages/Honey/ApiariesList'
import ApiaryDetail from './pages/Honey/ApiaryDetail'
import HivesList from './pages/Honey/HivesList'
import HiveDetail from './pages/Honey/HiveDetail'
import CostsAnalysis from './pages/Honey/CostsAnalysis'

// Shorthand: protected + requires a specific business module
function RE({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute module="real_estate">{children}</ProtectedRoute>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Home — protected, no module check */}
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />

        {/* Real-estate — requires real_estate permission */}
        <Route path="/real-estate"                                                    element={<RE><PropertiesList /></RE>} />
        <Route path="/real-estate/analytics"                                          element={<RE><Analytics /></RE>} />
        <Route path="/real-estate/add"                                                element={<RE><AddProperty /></RE>} />
        <Route path="/real-estate/:id"                                                element={<RE><PropertyDetail /></RE>} />
        <Route path="/real-estate/:id/edit"                                           element={<RE><EditProperty /></RE>} />
        <Route path="/real-estate/:id/record-sale"                                    element={<RE><RecordSale /></RE>} />
        <Route path="/real-estate/:id/add-acquisition-cost"                           element={<RE><AddAcquisitionCost /></RE>} />
        <Route path="/real-estate/:id/add-maintenance-cost"                           element={<RE><AddMaintenanceCost /></RE>} />
        <Route path="/real-estate/:id/add-lease"                                      element={<RE><AddLease /></RE>} />
        <Route path="/real-estate/:id/lease/:leaseId"                                 element={<RE><LeaseDetail /></RE>} />
        <Route path="/real-estate/:id/lease/:leaseId/add-payment"                    element={<RE><AddRentPayment /></RE>} />
        <Route path="/real-estate/:id/lease/:leaseId/payment/:paymentId/edit"        element={<RE><EditRentPayment /></RE>} />

        {/* Honey — requires honey permission, language context via HoneyLayout */}
        <Route path="/honey" element={<HoneyLayout />}>
          <Route index                  element={<HoneyDashboard />} />
          <Route path="apiaries"        element={<ApiariesList />} />
          <Route path="apiaries/:id"    element={<ApiaryDetail />} />
          <Route path="hives"           element={<HivesList />} />
          <Route path="hives/:id"       element={<HiveDetail />} />
          <Route path="costs"           element={<CostsAnalysis />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
