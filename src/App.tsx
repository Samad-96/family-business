import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected — must be logged in */}
        <Route path="/" element={<ProtectedRoute><Navigate to="/real-estate" replace /></ProtectedRoute>} />
        <Route path="/real-estate" element={<ProtectedRoute><PropertiesList /></ProtectedRoute>} />
        <Route path="/real-estate/add" element={<ProtectedRoute><AddProperty /></ProtectedRoute>} />
        <Route path="/real-estate/:id" element={<ProtectedRoute><PropertyDetail /></ProtectedRoute>} />
        <Route path="/real-estate/:id/edit" element={<ProtectedRoute><EditProperty /></ProtectedRoute>} />
        <Route path="/real-estate/:id/record-sale" element={<ProtectedRoute><RecordSale /></ProtectedRoute>} />
        <Route path="/real-estate/:id/add-acquisition-cost" element={<ProtectedRoute><AddAcquisitionCost /></ProtectedRoute>} />
        <Route path="/real-estate/:id/add-maintenance-cost" element={<ProtectedRoute><AddMaintenanceCost /></ProtectedRoute>} />
        <Route path="/real-estate/:id/add-lease" element={<ProtectedRoute><AddLease /></ProtectedRoute>} />
        <Route path="/real-estate/:id/lease/:leaseId" element={<ProtectedRoute><LeaseDetail /></ProtectedRoute>} />
        <Route path="/real-estate/:id/lease/:leaseId/add-payment" element={<ProtectedRoute><AddRentPayment /></ProtectedRoute>} />
        <Route path="/real-estate/:id/lease/:leaseId/payment/:paymentId/edit" element={<ProtectedRoute><EditRentPayment /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
