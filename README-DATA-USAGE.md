# 📊 Data Usage Guide - Sistem Penjualan Titip Bayar

## 🎯 Overview
Sistem ini telah dilengkapi dengan data dummy yang ekstensif dan implementasi TanStack Table yang powerful untuk mengelola data dalam jumlah besar.

## 📈 Data Structure

### 🏪 **Toko (Stores) - 100 Data**
- **Implementasi**: TanStack Table dengan fitur lengkap
- **Lokasi**: `/dashboard/master-data/toko`
- **Fitur**:
  - ✅ Sorting pada semua kolom
  - 🔍 Global search
  - 📄 Pagination (10, 20, 30, 50, 100 items/page)
  - 🎨 Modern UI dengan icons dan badges
  - 📱 Responsive design
  - 🔗 Direct link ke Google Maps
  - 📊 Real-time statistics

### 📊 **Database Scale**
```sql
-- Extended Data Summary:
- 10 Sales (9 aktif, 1 nonaktif)
- 20 Produk (19 aktif, 1 nonaktif)
- 100 Toko (99 aktif, 1 nonaktif)
- 200 Pengiriman (6 bulan data)
- 600+ Detail pengiriman
- 150 Penagihan
- 450+ Detail penagihan
- 25 Potongan penagihan
- 100 Setoran
```

## 🚀 Usage Instructions

### 1. **Database Setup**
```bash
# Step 1: Jalankan schema database
# Di Supabase Dashboard → SQL Editor:
# Copy-paste isi file: database-schema.sql

# Step 2: Insert data dummy
# Di Supabase Dashboard → SQL Editor:
# Copy-paste isi file: dummy-data-extended.sql
```

### 2. **Development Server**
```bash
# Start development server
npm run dev

# Access aplikasi
http://localhost:3001
```

### 3. **Test Login**
```bash
# Default credentials (setelah create user):
Email: test@example.com
Password: password123
```

## 🔧 TanStack Table Features

### ✨ **Advanced Table Features**
- **Sorting**: Click header untuk sort ascending/descending
- **Global Search**: Search across all columns
- **Pagination**: Navigate through large datasets
- **Responsive**: Works pada semua device sizes
- **Type-safe**: Full TypeScript support

### 📱 **Mobile Optimized**
- Horizontal scroll untuk table pada mobile
- Compact pagination controls
- Touch-friendly buttons
- Responsive statistics cards

### 🎨 **Modern UI Components**
- Shadcn/ui components
- Tailwind CSS styling
- Lucide icons
- Smooth animations
- Color-coded status badges

## 📋 **Column Configuration**

### 🏪 **Toko Table Columns**
```typescript
1. Nama Toko (sortable, searchable)
   - Store icon + name
   - Village name subtitle

2. Sales (sortable, searchable)
   - Sales person name
   - User icon

3. Alamat (searchable)
   - Full address
   - Kecamatan, Kabupaten

4. PIC (sortable, searchable)
   - Contact person name
   - Phone number

5. Kabupaten (sortable, searchable)
   - Location pin icon
   - Regency name

6. Status (sortable, searchable)
   - Color-coded badges
   - Active/Inactive

7. Actions
   - Google Maps link
   - View details
   - Edit
   - Delete
```

## 🔍 **Search & Filter**

### 🔍 **Global Search**
```typescript
// Search across:
- Nama toko
- Sales name
- Alamat
- PIC name
- Kabupaten
- Status
```

### 📊 **Statistics Cards**
- **Total Toko**: Live count
- **Toko Aktif**: Active stores
- **Toko Nonaktif**: Inactive stores
- **Baru Bulan Ini**: New stores this month

## 🎯 **Performance Optimizations**

### ⚡ **Client-side Processing**
- Efficient filtering algorithms
- Optimized rendering
- Memoized calculations
- Lazy loading ready

### 🔄 **State Management**
- React hooks untuk state
- TanStack Table state management
- Optimistic updates
- Error handling

## 🛠️ **Customization**

### 🎨 **Styling**
```typescript
// Colors dapat diubah di:
- Tailwind config
- CSS variables
- Component props

// Responsive breakpoints:
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
```

### 📊 **Column Customization**
```typescript
// Tambah kolom baru:
columnHelper.accessor('field_name', {
  header: 'Header Name',
  cell: ({ row }) => (
    <YourCustomComponent data={row.original} />
  ),
  enableSorting: true,
  enableGlobalFilter: true,
})
```

## 📈 **Scaling for Production**

### 🚀 **Server-side Processing**
Untuk data > 1000 rows, implement:
- Server-side pagination
- Server-side sorting
- Server-side filtering
- Virtual scrolling

### 🔄 **API Integration**
```typescript
// Replace mock data dengan real API:
const fetchStores = async () => {
  const response = await fetch('/api/toko?page=1&limit=10&search=term')
  const data = await response.json()
  setData(data.items)
  // Update pagination state
}
```

## 🧪 **Testing**

### ✅ **Test Scenarios**
1. **Search functionality**
   - Global search
   - Empty results
   - Special characters

2. **Sorting**
   - Ascending/descending
   - Multiple columns
   - Mixed data types

3. **Pagination**
   - Page navigation
   - Page size changes
   - Edge cases

4. **Responsive**
   - Mobile devices
   - Tablet view
   - Desktop large screens

## 🔒 **Security Considerations**

### 🛡️ **Data Protection**
- RLS (Row Level Security) di Supabase
- Input sanitization
- XSS protection
- CSRF protection

### 🔐 **Authentication**
- JWT tokens
- Session management
- Role-based access
- Secure logout

## 📚 **Documentation Links**

- [TanStack Table Docs](https://tanstack.com/table/v8)
- [Shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase Docs](https://supabase.com/docs)

## 🎯 **Next Steps**

1. **Add More Tables**
   - Implement TanStack Table untuk produk
   - Sales dengan advanced filtering
   - Transaksi dengan date range

2. **Advanced Features**
   - Export to CSV/Excel
   - Bulk actions
   - Advanced filters
   - Data visualization

3. **Performance**
   - Virtual scrolling
   - Infinite loading
   - Caching strategies
   - Service workers

---

**⚡ Ready to handle enterprise-scale data management!**