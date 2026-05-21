import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
        <Route path="/" element={<Navigate to="/real-estate" replace />} />
        <Route path="/real-estate" element={<PropertiesList />} />
        <Route path="/real-estate/add" element={<AddProperty />} />
        <Route path="/real-estate/:id" element={<PropertyDetail />} />
        <Route path="/real-estate/:id/edit" element={<EditProperty />} />
        <Route path="/real-estate/:id/record-sale" element={<RecordSale />} />
        <Route path="/real-estate/:id/add-acquisition-cost" element={<AddAcquisitionCost />} />
        <Route path="/real-estate/:id/add-maintenance-cost" element={<AddMaintenanceCost />} />
        <Route path="/real-estate/:id/add-lease" element={<AddLease />} />
        <Route path="/real-estate/:id/lease/:leaseId" element={<LeaseDetail />} />
        <Route path="/real-estate/:id/lease/:leaseId/add-payment" element={<AddRentPayment />} />
        <Route path="/real-estate/:id/lease/:leaseId/payment/:paymentId/edit" element={<EditRentPayment />} />
      </Routes>
    </BrowserRouter>
  )
}
