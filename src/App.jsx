import { useState, useEffect } from 'react'
import { 
  Package, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  History, 
  CreditCard,
  AlertCircle,
  Truck,
  CheckCircle2,
  Clock,
  Trash2,
  BarChart3,
  QrCode,
  Share2,
  Copy,
  X,
  Percent,
  Calculator,
  Tag,
  ClipboardList
} from 'lucide-react'



import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  LineChart, 
  Line, 
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts'
import { auth, googleProvider } from './firebase'
import { signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'
import './App.css'

const InstagramIcon = ({ size = 24, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)


function App() {
  const [user, setUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoadingAuth(false)
    })
    return () => unsubscribe()
  }, [])

  const handleLogin = async () => {
    try {
      await signInWithRedirect(auth, googleProvider)
    } catch (e) {
      console.error("Login failed", e)
    }
  }

  const [rate, setRate] = useState(0) // Tasa Binance (Paralelo)
  const [rateBcv, setRateBcv] = useState(0)
  const [rateEuro, setRateEuro] = useState(0)
  const [inventory, setInventory] = useState(() => {
    try {
      const saved = localStorage.getItem('outlet_inventory')
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      console.error("Error loading inventory:", e)
      return []
    }
  })
  const [sales, setSales] = useState(() => {
    try {
      const saved = localStorage.getItem('outlet_sales')
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      console.error("Error loading sales:", e)
      return []
    }
  })
  const [promotions, setPromotions] = useState(() => {
    try {
      const saved = localStorage.getItem('outlet_promotions')
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      console.error("Error loading promotions:", e)
      return []
    }
  })
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('outlet_notes')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })
  const [newNote, setNewNote] = useState({ title: '', text: '' })
  
  const [activeTab, setActiveTab] = useState('inventory') // inventory, sales, installments, calc, notes


  const [calcVal, setCalcVal] = useState('0')
  const [calcHistory, setCalcHistory] = useState('')
  const [shouldReset, setShouldReset] = useState(false)
  const [calcRateType, setCalcRateType] = useState('bcv') // bcv, euro, binance
  const [calcMode, setCalcMode] = useState('financial') // financial, normal


  const handleCalcInput = (n) => {
    if (calcVal === '0' || shouldReset) {
      setCalcVal(String(n))
      setShouldReset(false)
    } else {
      setCalcVal(calcVal + String(n))
    }
  }

  const handleCalcOp = (op) => {
    setCalcHistory(calcVal + ' ' + op)
    setShouldReset(true)
  }

  const handleCalcEqual = () => {
    try {
      if (!calcHistory) return
      const expression = calcHistory + ' ' + calcVal
      // Safe eval (only numbers and basic ops)
      const sanitized = expression.replace(/[^-()\d/*+.]/g, '')
      const result = eval(sanitized)
      setCalcVal(String(result))
      setCalcHistory('')
      setShouldReset(true)
    } catch (e) {
      setCalcVal('Error')
    }
  }

  const clearCalc = () => {
    setCalcVal('0')
    setCalcHistory('')
  }

  // Inventory/Sales Form states
  const [newItem, setNewItem] = useState({ name: '', quantity: '', priceUsd: '' })
  const [newSale, setNewSale] = useState({ 
    itemId: '', 
    quantity: 1, 
    paymentMethod: 'USD', 
    status: 'paid', 
    customerName: '', 
    installments: 2, 
    downPayment: '', 
    paidInstallments: 0, 
    installmentsToPay: 0, 
    isManualQuantity: false,
    sharedUsd: '',
    sharedVes: '',
    sharedVesUsd: '',
    customerID: '',
    customerIDPrefix: 'V',
    customerPhone: '',
    customerEmail: '',
    rateType: 'bcv' // bcv, euro, binance


  })
  const [showQrModal, setShowQrModal] = useState(false)
  const [showIgModal, setShowIgModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  const [resumingSaleId, setResumingSaleId] = useState(null)

  useEffect(() => {
    fetchRate()
    const interval = setInterval(fetchRate, 300000) // Update every 5 mins
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    localStorage.setItem('outlet_inventory', JSON.stringify(inventory))
  }, [inventory])

  useEffect(() => {
    localStorage.setItem('outlet_sales', JSON.stringify(sales))
  }, [sales])

  useEffect(() => {
    localStorage.setItem('outlet_promotions', JSON.stringify(promotions))
  }, [promotions])

  useEffect(() => {
    localStorage.setItem('outlet_notes', JSON.stringify(notes))
  }, [notes])

  const fetchRate = async () => {
    try {
      // Binance (Paralelo)
      const resBinance = await fetch('https://ve.dolarapi.com/v1/dolares/paralelo')
      const dataBinance = await resBinance.json()
      setRate(dataBinance.promedio || dataBinance.price)

      // BCV (Oficial)
      const resBcv = await fetch('https://ve.dolarapi.com/v1/dolares/oficial')
      if (resBcv.ok) {
        const dataBcv = await resBcv.json()
        setRateBcv(dataBcv.promedio || dataBcv.price)
      }

      // Euro (Oficial)
      const resEuro = await fetch('https://ve.dolarapi.com/v1/euros/oficial')
      if (resEuro.ok) {
        const dataEuro = await resEuro.json()
        setRateEuro(dataEuro.promedio || dataEuro.price)
      }
    } catch (error) {
      console.error("Error fetching rates:", error)
      if(rate === 0) setRate(50.0)
    }
  }

  const addInventory = (e) => {
    e.preventDefault()
    if (!newItem.name || !newItem.quantity || !newItem.priceUsd) return
    
    const existingIndex = inventory.findIndex(i => i.name.toLowerCase() === newItem.name.toLowerCase())
    
    if (existingIndex >= 0) {
      const updated = [...inventory]
      updated[existingIndex].quantity += parseInt(newItem.quantity)
      updated[existingIndex].priceUsd = parseFloat(newItem.priceUsd)
      setInventory(updated)
    } else {
      setInventory([...inventory, {
        id: Date.now().toString(),
        name: newItem.name,
        quantity: parseInt(newItem.quantity),
        priceUsd: parseFloat(newItem.priceUsd)
      }])
    }
    setNewItem({ name: '', quantity: '', priceUsd: '' })
  }

  const getActiveRate = () => {
    if (newSale.rateType === 'bcv') return rateBcv
    if (newSale.rateType === 'euro') return rateEuro
    return rate // binance
  }

  const registerSale = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!newSale.itemId || !newSale.quantity) {
      setShowQrModal(false)
      return
    }
    
    const item = inventory.find(i => i.id === newSale.itemId)
    if (!resumingSaleId && (!item || item.quantity < newSale.quantity)) {
      alert(`Solo tengo ${item ? item.quantity : 0} ${item ? item.name : 'artículos'} disponibles. Por favor verifique la cantidad.`)
      return
    }
    
    const activeRate = getActiveRate();
    if (((newSale.paymentMethod === 'VES') || (newSale.paymentMethod === 'SHARED' && (Number(newSale.sharedVes) / activeRate) >= 1)) && !showQrModal) {
      setShowQrModal(true)
      return
    }

    const totalUsd = calculateItemTotal(newSale.itemId, newSale.quantity, newSale.paymentMethod)
    const priceToUse = totalUsd / newSale.quantity
    const totalVes = totalUsd * activeRate
    
    if (!resumingSaleId) {
      setInventory(inventory.map(i => 
        i.id === newSale.itemId ? { ...i, quantity: i.quantity - newSale.quantity } : i
      ))
    }

    const sale = resumingSaleId ? sales.find(s => String(s.id) === String(resumingSaleId)) : null
    
    const currentMoneyPaid = newSale.paymentMethod === 'SHARED' 
      ? (Number(newSale.sharedUsd || 0) + (Number(newSale.sharedVes || 0) / activeRate))
      : (newSale.status === 'pending' ? (Number(newSale.downPayment || 0)) : totalUsd);

    const historicalMoney = resumingSaleId ? (sale.downPayment || 0) : 0;
    const totalAccumulated = historicalMoney + currentMoneyPaid;
    const isFullyPaid = totalAccumulated >= (totalUsd - 0.05);

    const newSaleData = {
      id: resumingSaleId || Date.now().toString(),
      itemId: newSale.itemId,
      itemName: item.name,
      customerName: newSale.customerName || 'Cliente General',
      customerID: newSale.customerID ? `${newSale.customerIDPrefix}-${newSale.customerID}` : '',
      customerPhone: newSale.customerPhone || '',
      customerEmail: newSale.customerEmail || '',

      quantity: parseInt(newSale.quantity),

      priceUsd: priceToUse,
      totalUsd,
      totalVes,
      rate: activeRate,
      rateType: newSale.rateType,
      paymentMethod: newSale.paymentMethod,
      sharedUsd: newSale.paymentMethod === 'SHARED' ? Number(newSale.sharedUsd) : (newSale.paymentMethod === 'USD' ? (resumingSaleId ? currentMoneyPaid : totalUsd) : 0),
      sharedVes: newSale.paymentMethod === 'SHARED' ? Number(newSale.sharedVes) : (newSale.paymentMethod === 'VES' ? (resumingSaleId ? (currentMoneyPaid * activeRate) : totalVes) : 0),
      status: isFullyPaid ? 'paid' : 'pending',
      installments: Number(newSale.installments),
      paidInstallments: isFullyPaid ? Number(newSale.installments) : (resumingSaleId ? (Number(sale.paidInstallments) + Number(newSale.installmentsToPay)) : 0),
      downPayment: totalAccumulated,
      date: resumingSaleId ? sale.date : new Date().toISOString(),
      sellerName: user?.displayName || 'Vendedor Desconocido',
      sellerEmail: user?.email || 'N/A'
    }

    if (resumingSaleId) {
      setSales(sales.map(s => s.id === resumingSaleId ? newSaleData : s))
    } else {
      setSales([...sales, newSaleData])
    }
    
    setSelectedReceipt(newSaleData)
    setShowReceiptModal(true)
    
    setNewSale({ 
      itemId: '', 
      quantity: 1, 
      paymentMethod: 'USD', 
      status: 'paid', 
      customerName: '', 
      installments: 2, 
      downPayment: '', 
      paidInstallments: 0, 
      installmentsToPay: 0,
      sharedUsd: '',
      sharedVes: '',
      sharedVesUsd: '',
      customerID: '',
      customerIDPrefix: 'V',
      customerPhone: '',
      customerEmail: '',

      isManualQuantity: false,
      rateType: 'bcv'

    })
    setShowQrModal(false)
    setResumingSaleId(null)
  }

  const resumePendingSale = (sale) => {
    const item = inventory.find(i => i.id === sale.itemId || i.name === sale.itemName)
    if (!item) {
      alert("La prenda original ya no existe en el inventario.")
      return
    }

    setNewSale({
      itemId: item.id,
      quantity: sale.quantity,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      customerName: sale.customerName,
      customerIDPrefix: sale.customerID?.startsWith('E-') ? 'E' : 'V',
      customerID: (sale.customerID?.includes('-') ? sale.customerID.split('-')[1] : sale.customerID) || '',
      customerPhone: sale.customerPhone || '',
      customerEmail: sale.customerEmail || '',

      installments: sale.installments || 2,

      downPayment: sale.downPayment || 0,
      paidInstallments: sale.paidInstallments || 0,
      installmentsToPay: 1
    })
    setResumingSaleId(sale.id)
    setActiveTab('sales')
  }

  const handlePrint = () => {
    window.print()
  }

  const handleWhatsAppShare = (sale) => {
    const text = `*Recibo de Pago - Outlet Caricuao*%0A
----------------------------------%0A
*Cliente:* ${sale.customerName}%0A
*Cédula:* ${sale.customerID}%0A
*Fecha:* ${new Date(sale.date).toLocaleDateString()}%0A
----------------------------------%0A
*Articulo:* ${sale.itemName}%0A
*Cantidad:* ${sale.quantity}%0A
*Total USD:* ${formatCurrency(sale.totalUsd)}%0A
*Total VES:* ${formatCurrency(sale.totalVes, 'VES')}%0A
*Tasa:* ${formatCurrency(sale.rate, 'VES')} (${sale.rateType.toUpperCase()})%0A
----------------------------------%0A
¡Gracias por tu compra! 🛍️%0A
*Atendido por:* ${sale.sellerName || 'Vendedor'}`
    
    window.open(`https://wa.me/${sale.customerPhone.replace(/\D/g, '')}?text=${text}`, '_blank')
  }

  const deleteInventory = (id) => {
    if (window.confirm("¿Seguro que desea eliminar este item?")) {
      setInventory(inventory.filter(i => i.id !== id))
    }
  }

  const deleteSale = (id) => {
    if (window.confirm("¿Seguro que desea eliminar este registro de venta?")) {
      const sale = sales.find(s => String(s.id) === String(id))
      // Optional: Restore stock if deleted? Let's do it.
      if (sale && window.confirm("¿Desea devolver los artículos al inventario?")) {
        setInventory(inventory.map(i => 
          i.name === sale.itemName ? { ...i, quantity: i.quantity + sale.quantity } : i
        ))
      }
      setSales(sales.filter(s => s.id !== id))
    }
  }

  const updateSaleStatus = (saleId, newStatus) => {
    setSales(sales.map(s => s.id === saleId ? { ...s, status: newStatus } : s))
  }

  const calculateItemTotal = (itemId, quantity, paymentMethod = 'USD', hasVes = false) => {
    // Si estamos retomando una venta, el total ya fue fijado en su creación para evitar saltos de precio
    if (resumingSaleId) {
      const existingSale = sales.find(s => String(s.id) === String(resumingSaleId))
      if (existingSale) return existingSale.totalUsd
    }

    const item = inventory.find(i => i.id === itemId)
    if (!item) return 0
    
    const qty = Number(quantity) || 0
    const basePrice = Number(item.priceUsd)

    // Las promociones aplican para USD y Pago Compartido SOLO SI no hay bolívares de por medio.
    // Si hay bolívares (VES o SHARED con monto en Bs), se cobra a precio normal.
    if (paymentMethod === 'VES' || hasVes) return basePrice * qty

    // Ordenar promociones de mayor a menor cantidad para aplicar los combos mas grandes primero
    const itemPromos = promotions
      .filter(p => p.itemId === itemId)
      .sort((a, b) => Number(b.minQuantity) - Number(a.minQuantity))
    
    let remainingQty = qty
    let total = 0
    
    itemPromos.forEach(promo => {
      const minQty = Number(promo.minQuantity)
      if (remainingQty >= minQty) {
        const numBundles = Math.floor(remainingQty / minQty)
        total += numBundles * Number(promo.totalPrice)
        remainingQty %= minQty
      }
    })
    
    total += remainingQty * basePrice
    return total
  }

  const formatCurrency = (val, currency = 'USD') => {
    return currency === 'USD' 
      ? `$${parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      : `Bs. ${parseFloat(val).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
  }

  const copyPaymentData = () => {
    const data = "Pago Móvil Mercantil: 04142378679, CI: 24901796"
    navigator.clipboard.writeText(data)
    alert("Datos de Pago Móvil copiados al portapapeles")
  }

  const stats = {
    totalItems: (inventory || []).reduce((acc, i) => acc + (Number(i.quantity) || 0), 0),
    inventoryValue: (inventory || []).reduce((acc, i) => acc + ((Number(i.quantity) || 0) * (Number(i.priceUsd) || 0)), 0),
    totalSales: (sales || []).reduce((acc, s) => acc + (s.status === 'paid' ? (Number(s.totalUsd) || 0) : (Number(s.downPayment) || 0)), 0),
    pendingSales: (sales || []).filter(s => s && s.status === 'pending').reduce((acc, s) => acc + ((Number(s.totalUsd) || 0) - (Number(s.downPayment) || 0)), 0)
  }

  if (loadingAuth) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>Cargando sesión...</div>
  }

  if (!user) {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-default)' }}>
        <div className="premium-card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <ShoppingCart size={48} color="var(--primary)" style={{ marginBottom: '1rem', margin: '0 auto' }} />
          <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Outlet Caricuao</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Punto de Venta Exclusivo para Vendedores</p>
          <button onClick={handleLogin} className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
             Ingresar con Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <motion.div 
          initial={{ x: -20, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }}
          style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}
        >
          <img src="/logo.jpg" alt="Outlet Caricuao" style={{ width: '80px', height: '80px', borderRadius: '50%', boxShadow: '0 5px 15px rgba(142, 108, 69, 0.2)' }} />
          <div>
            <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(to right, var(--primary-glow), var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.2rem' }}>
              Outlet Caricuao
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img src={user.photoURL || 'https://via.placeholder.com/20'} alt="Avatar" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)', fontWeight: 'bold' }}>{user.displayName?.split(' ')[0]}</span>
              <span style={{ fontSize: '0.8rem', color: '#888' }}>|</span>
              <button onClick={() => signOut(auth)} style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.8rem', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}>Cerrar Sesión</button>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowIgModal(true)}
            style={{
              background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              border: 'none',
              borderRadius: '12px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220, 39, 67, 0.3)',
              marginLeft: '0.5rem'
            }}
            title="Instagram Store"
          >
            <InstagramIcon size={24} />

          </motion.button>
        </motion.div>

        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="premium-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '2px solid var(--success)' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasa BCV</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--success)' }}>{formatCurrency(rateBcv, 'VES')}</p>
            </div>
          </motion.div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="premium-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '2px solid var(--primary)' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasa Euro</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatCurrency(rateEuro, 'VES')}</p>
            </div>
          </motion.div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="premium-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '2px solid var(--accent)' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasa Binance</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent)' }}>{formatCurrency(rate, 'VES')}</p>
            </div>
          </motion.div>
        </div>
      </header>

      {activeTab !== 'sales' && (
        <div className="stats-grid">
          <StatCard title="Total Prendas" value={stats.totalItems} icon={<Package size={20} />} />
          <StatCard title="Valor Inventario" value={formatCurrency(stats.inventoryValue)} icon={<DollarSign size={20} />} color="var(--primary)" />
          <StatCard title="Ventas Totales" value={formatCurrency(stats.totalSales)} icon={<ShoppingCart size={20} />} color="var(--success)" />
          <StatCard title="Por Cobrar" value={formatCurrency(stats.pendingSales)} icon={<CreditCard size={20} />} color="var(--warning)" />
        </div>
      )}

      <nav className="nav-container">
        <div className="tabs desktop-tabs">
          <div className={`tab ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>Inventario</div>
          <div className={`tab ${activeTab === 'promos' ? 'active' : ''}`} onClick={() => setActiveTab('promos')}>Promociones</div>
          <div className={`tab ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>Vender</div>
          <div className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Historial</div>
          <div className={`tab ${activeTab === 'installments' ? 'active' : ''}`} onClick={() => setActiveTab('installments')}>Cuotas/Pendientes</div>
          <div className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Estadísticas</div>
          <div className={`tab ${activeTab === 'calc' ? 'active' : ''}`} onClick={() => setActiveTab('calc')}>Calculadora</div>
          <div className={`tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>Pendientes</div>
        </div>
        <div className="mobile-tabs">
          <select 
            value={activeTab} 
            onChange={(e) => setActiveTab(e.target.value)} 
            className="tab-select"
          >
            <option value="inventory">Inventario</option>
            <option value="promos">Promociones</option>
            <option value="sales">Vender</option>
            <option value="history">Historial</option>
            <option value="installments">Cuotas/Pendientes</option>
            <option value="stats">Estadísticas</option>
            <option value="calc">Calculadora</option>
            <option value="notes">Notas Pendientes</option>
          </select>
        </div>
      </nav>

      <main>
        <AnimatePresence mode="wait">
          {activeTab === 'inventory' && (
            <motion.div key="inventory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid-layout">
                <div className="premium-card">
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={20} /> Agregar Prenda
                  </h3>
                  <form onSubmit={addInventory}>
                    <div className="input-group">
                      <label>Tipo de Prenda (ej. Camisa, Sueter)</label>
                      <input 
                        type="text" 
                        value={newItem.name} 
                        onChange={e => setNewItem({...newItem, name: e.target.value})}
                        placeholder="Nombre de la prenda"
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label>Cantidad</label>
                      <input 
                        type="number" 
                        value={newItem.quantity} 
                        onChange={e => setNewItem({...newItem, quantity: e.target.value})}
                        placeholder="0"
                        min="1"
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label>Precio Unitario (USD)</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="number" 
                          step="1"
                          value={newItem.priceUsd} 
                          onChange={e => setNewItem({...newItem, priceUsd: e.target.value})}
                          placeholder="0"
                          min="1"
                          required
                        />
                        {newItem.priceUsd && getActiveRate() > 0 && (
                          <div className="currency-preview">
                            <span>Estimado Bs.</span>
                            <span>{formatCurrency(newItem.priceUsd * getActiveRate(), 'VES')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                      Guardar en Stock
                    </button>
                  </form>
                </div>

                <div className="premium-card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Stock Actual</h3>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Prenda</th>
                          <th>Cant.</th>
                          <th>Precio USD</th>
                          <th>Precio VES</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.length === 0 ? (
                          <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sin items registrados</td></tr>
                        ) : (
                          inventory.map(item => (
                            <tr key={item.id}>
                              <td style={{ fontWeight: '500' }}>{item.name}</td>
                              <td><span className={`badge ${item.quantity < 5 ? 'badge-danger' : 'badge-success'}`}>{item.quantity}</span></td>
                              <td>{formatCurrency(item.priceUsd)}</td>
                              <td style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>{formatCurrency(item.priceUsd * rate, 'VES')}</td>
                              <td>
                                <button 
                                  onClick={() => deleteInventory(item.id)}
                                  style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '4px' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'promos' && (
            <motion.div key="promos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid-layout">
                <div className="premium-card">
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Tag size={20} /> Crear Promoción
                  </h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const selectedItemId = formData.get('itemId');
                    const selectedItem = inventory.find(i => String(i.id) === String(selectedItemId));
                    
                    if (!selectedItem) {
                      alert('Por favor seleccione una prenda válida.');
                      return;
                    }

                    const minQty = parseInt(formData.get('minQty'));
                    const totalPrice = parseFloat(formData.get('totalPrice'));
                    const newPromo = {
                      id: Date.now().toString(),
                      itemId: selectedItemId,
                      itemName: selectedItem.name,
                      minQuantity: minQty,
                      promoPrice: totalPrice / minQty,
                      totalPrice: totalPrice
                    };
                    setPromotions([...promotions, newPromo]);
                    e.target.reset();
                  }}>
                    <div className="input-group">
                      <label>Prenda para la Oferta</label>
                      <select name="itemId" required>
                        <option value="">Seleccione...</option>
                        {inventory.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid-2-cols" style={{ marginTop: 0 }}>
                      <div className="input-group">
                        <label>Si compra (Cantidad)</label>
                        <input type="number" name="minQty" placeholder="Ej. 3" min="1" required />
                      </div>
                      <div className="input-group">
                        <label>Precio TOTAL del combo ($)</label>
                        <input type="number" step="0.01" name="totalPrice" placeholder="Ej. 10.00" min="0.01" required />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                      Activar Promoción
                    </button>
                  </form>
                </div>

                <div className="premium-card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Promociones Activas</h3>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Condición</th>
                          <th>Precio Promo</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {promotions.length === 0 ? (
                          <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay promociones</td></tr>
                        ) : (
                          promotions.map(promo => (
                            <tr key={promo.id}>
                              <td>
                                <div style={{ fontWeight: '500' }}>{promo.itemName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Desde {promo.minQuantity} unidades</div>
                              </td>
                              <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                                {formatCurrency(promo.totalPrice || (promo.promoPrice * promo.minQuantity))} combo
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({formatCurrency(promo.promoPrice)} c/u)</div>
                              </td>
                              <td>
                                <button 
                                  onClick={() => setPromotions(promotions.filter(p => p.id !== promo.id))}
                                  style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'sales' && (
            <motion.div key="sales" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div className="premium-card">
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingCart size={20} /> {resumingSaleId ? 'Retomar Venta' : 'Registrar Venta'}
                  </h3>

                  {resumingSaleId && (
                    <div className="premium-card" style={{ background: 'rgba(142, 108, 69, 0.15)', border: '1px solid var(--accent)', marginBottom: '1.5rem', position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', paddingRight: '2rem' }}>
                        <Clock size={24} color="var(--accent)" style={{ marginTop: '0.2rem' }} />
                        <div>
                          <p style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '0.25rem' }}>Retomando Pedido: {newSale.customerName}</p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--warning)', fontWeight: 'bold' }}>
                             Saldo Restante: {(() => {
                               const sale = sales.find(s => String(s.id) === String(resumingSaleId));
                               return sale ? formatCurrency(sale.totalUsd - sale.downPayment) : '$0.00';
                             })()}
                          </p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Actualizando pagos de cuotas. El inventario ya fue descontado.
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setResumingSaleId(null)
                          setNewSale({ itemId: '', quantity: 1, paymentMethod: 'USD', status: 'paid', customerName: '', installments: 2, downPayment: 0 })
                          setActiveTab('installments')
                        }}
                        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}
                        title="Cancelar y volver"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  )}

                  <form onSubmit={registerSale}>
                    <div className="grid-2-cols" style={{ marginTop: 0 }}>
                      <div className="input-group">
                        <label>Nombre del Cliente</label>
                        <input 
                          type="text" 
                          value={newSale.customerName} 
                          onChange={e => setNewSale({...newSale, customerName: e.target.value})}
                          placeholder="Ej. Juan Pérez"
                        />
                      </div>
                      <div className="input-group">
                        <label>Cédula / ID</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <select 
                            value={newSale.customerIDPrefix} 
                            onChange={e => setNewSale({...newSale, customerIDPrefix: e.target.value})}
                            style={{ flex: '0 0 70px', padding: '0.75rem 0.5rem' }}
                          >
                            <option value="V">V</option>
                            <option value="E">E</option>
                          </select>
                          <input 
                            type="text" 
                            value={newSale.customerID} 
                            onChange={e => setNewSale({...newSale, customerID: e.target.value.replace(/\D/g, '')})}
                            placeholder="12345678"
                            style={{ flex: 1 }}
                          />
                        </div>
                      </div>
                    </div>


                    <div className="grid-2-cols" style={{ marginTop: '1rem' }}>
                      <div className="input-group">
                        <label>Teléfono Contacto</label>
                        <input 
                          type="tel" 
                          value={newSale.customerPhone} 
                          onChange={e => setNewSale({...newSale, customerPhone: e.target.value})}
                          placeholder="0414-0000000"
                        />
                      </div>
                      <div className="input-group">
                        <label>Correo (Opcional)</label>
                        <input 
                          type="email" 
                          value={newSale.customerEmail} 
                          onChange={e => setNewSale({...newSale, customerEmail: e.target.value})}
                          placeholder="ejemplo@correo.com"
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <label>Prenda</label>
                      {resumingSaleId ? (
                        <div className="premium-card" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                          <span style={{ fontWeight: '500' }}>{inventory.find(i => i.id === newSale.itemId)?.name || 'Prenda Cargada'}</span>
                        </div>
                      ) : (
                        <select 
                          value={newSale.itemId} 
                          onChange={e => {
                            setNewSale({
                              ...newSale, 
                              itemId: e.target.value,
                              quantity: 1,
                              isManualQuantity: false // Reset mode
                            })
                          }}
                          required
                        >
                          <option value="">Seleccione una prenda...</option>
                          {inventory.filter(i => i.quantity > 0).map(item => {
                            const hasPromo = promotions.some(p => p.itemId === item.id);
                            return (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.quantity} disponibles) - {formatCurrency(item.priceUsd)} {hasPromo ? '🔥' : ''}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                    
                    <div className="input-group">
                      <label>Cantidad</label>
                      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {(!newSale.isManualQuantity && (inventory.find(i => i.id === newSale.itemId)?.quantity || 0) <= 10) ? (
                            <select 
                              value={newSale.quantity} 
                              onChange={e => setNewSale({...newSale, quantity: parseInt(e.target.value)})}
                              required
                              style={{ flex: 1 }}
                            >
                              <option value="">Cant...</option>
                              {[...Array(inventory.find(i => i.id === newSale.itemId)?.quantity || 1)].map((_, i) => (
                                <option key={i+1} value={i+1}>{i+1}</option>
                              ))}
                            </select>
                          ) : !newSale.isManualQuantity ? (
                            <select 
                              value={newSale.quantity} 
                              onChange={e => {
                                if (e.target.value === 'manual') {
                                  setNewSale({...newSale, isManualQuantity: true, quantity: 11})
                                } else {
                                  setNewSale({...newSale, quantity: parseInt(e.target.value)})
                                }
                              }}
                              required
                              style={{ flex: 1 }}
                            >
                              {[...Array(10)].map((_, i) => (
                                <option key={i+1} value={i+1}>{i+1}</option>
                              ))}
                              <option value="manual">Otro (Manual)...</option>
                            </select>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                              <input 
                                type="number" 
                                value={newSale.quantity} 
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 1;
                                  const stock = inventory.find(i => i.id === newSale.itemId)?.quantity || 0;
                                  if (val > stock) {
                                    alert(`Error: Supera el inventario disponible (${stock})`);
                                    setNewSale({...newSale, quantity: stock});
                                  } else {
                                    setNewSale({...newSale, quantity: val});
                                  }
                                }}
                                min="1"
                                autoFocus
                                style={{ flex: 1 }}
                              />
                              <button 
                                type="button" 
                                onClick={() => setNewSale({...newSale, isManualQuantity: false, quantity: 1})}
                                className="btn-icon"
                                title="Volver a lista"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="input-group">
                      <label>Información de Promociones</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                        {promotions.length === 0 ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No hay promociones configuradas</div>
                        ) : (
                          promotions.map(promo => {
                            const isSelected = promo.itemId === newSale.itemId;
                            return (
                              <div 
                                key={promo.id} 
                                className="animate-fade-in" 
                                style={{ 
                                  fontSize: '0.8rem', 
                                  color: isSelected ? 'var(--success)' : 'var(--text-muted)', 
                                  background: isSelected ? 'rgba(107, 142, 35, 0.1)' : 'white', 
                                  padding: '0.6rem', 
                                  borderRadius: '8px', 
                                  borderLeft: `3px solid ${isSelected ? 'var(--success)' : 'var(--border)'}`,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <span>
                                  <Tag size={12} style={{ marginRight: '4px' }} /> 
                                  <strong>{promo.itemName}:</strong> {promo.minQuantity} o más por {formatCurrency(promo.totalPrice)}
                                </span>
                                {isSelected && <CheckCircle2 size={14} />}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginTop: 0 }}>
                      <div className="input-group">
                        <label>Método de Pago</label>
                        <select 
                          value={newSale.paymentMethod} 
                          onChange={e => setNewSale({...newSale, paymentMethod: e.target.value})}
                        >
                          <option value="USD">Dólares ($)</option>
                          <option value="VES">Bolívares (Bs)</option>
                          <option value="SHARED">Pago Compartido ($ + Bs)</option>
                        </select>
                      </div>

                      {(newSale.paymentMethod === 'VES' || newSale.paymentMethod === 'SHARED') && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="input-group">
                          <label>Tasa a Aplicar</label>
                          <select 
                            value={newSale.rateType} 
                            onChange={e => setNewSale({...newSale, rateType: e.target.value})}
                            style={{ border: '1px solid var(--accent)', background: 'rgba(142, 108, 69, 0.05)' }}
                          >
                            <option value="bcv">Tasa BCV ({formatCurrency(rateBcv, 'VES')})</option>
                            <option value="euro">Tasa Euro ({formatCurrency(rateEuro, 'VES')})</option>
                            <option value="binance">Tasa Binance ({formatCurrency(rate, 'VES')})</option>
                          </select>
                        </motion.div>
                      )}

                      <div className="input-group">
                        <label>Estado</label>
                        <select 
                          value={newSale.status} 
                          onChange={e => setNewSale({...newSale, status: e.target.value})}
                        >
                          <option value="paid">Pagado Total</option>
                          {newSale.paymentMethod !== 'SHARED' && <option value="pending">Aparte (Pendiente)</option>}
                        </select>
                      </div>
                    </div>

                    {newSale.paymentMethod === 'SHARED' && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="premium-card" style={{ background: 'rgba(142, 108, 69, 0.05)', marginBottom: '1rem', border: '1px dashed var(--accent)' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--accent)' }}>Desglose de Pago Compartido:</p>
                        <div className="grid-2-cols" style={{ marginTop: 0 }}>
                          <div className="input-group">
                            <label>Monto en $</label>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                               <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                 <input 
                                   type="number" 
                                   step="0.01" 
                                   value={newSale.sharedUsd}
                                   placeholder="0.00"
                                   style={{ flex: 1 }}
                                   onChange={e => {
                                     const val = e.target.value;
                                     if (val === '') {
                                       setNewSale({...newSale, sharedUsd: '', sharedVesUsd: '', sharedVes: ''});
                                     } else {
                                       const activeRate = getActiveRate();
                                       setNewSale({...newSale, sharedUsd: val});
                                     }
                                   }}
                                 />
                                 <button 
                                   type="button"
                                   title="Cubrir total con $"
                                   onClick={() => {
                                     const targetTotal = calculateItemTotal(newSale.itemId, newSale.quantity, 'SHARED');
                                     const activeRate = getActiveRate();
                                     const paidVesUsd = (Number(newSale.sharedVes) || 0) / activeRate;
                                     setNewSale({...newSale, sharedUsd: Math.max(0, targetTotal - paidVesUsd).toFixed(2)});
                                   }}
                                   style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.7rem' }}
                                 >
                                   Max
                                 </button>
                               </div>
                               {Number(newSale.sharedUsd) > 0 && (
                                 <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                   ≈ {formatCurrency(Number(newSale.sharedUsd) * getActiveRate(), 'VES')}
                                 </span>
                               )}
                             </div>
                          </div>
                           <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                             <label>Bolívares / Pago Móvil (Sincronizado)</label>
                             <div className="grid-2-cols" style={{ marginTop: 0 }}>
                               <div style={{ position: 'relative' }}>
                                 <input 
                                   type="number" 
                                   step="0.01" 
                                   value={newSale.sharedVesUsd}
                                   placeholder="En $"
                                   onChange={e => {
                                     const val = e.target.value;
                                     if (val === '') {
                                       setNewSale({...newSale, sharedVesUsd: '', sharedVes: ''});
                                     } else {
                                       // Solo actualizamos Bs, mantenemos el $ tal cual el usuario lo escribió
                                       const activeRate = getActiveRate();
                                       setNewSale({
                                         ...newSale, 
                                         sharedVesUsd: val, 
                                         sharedVes: (parseFloat(val) * activeRate).toFixed(2)
                                       });
                                     }
                                   }}
                                 />
                                 <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '0.8rem' }}>$</div>
                               </div>
                               <div style={{ position: 'relative' }}>
                                 <input 
                                   type="number" 
                                   step="0.01" 
                                   value={newSale.sharedVes}
                                   placeholder="En Bs"
                                   onChange={e => {
                                     const val = e.target.value;
                                     if (val === '') {
                                       setNewSale({...newSale, sharedVes: '', sharedVesUsd: ''});
                                     } else {
                                       // Solo actualizamos $, mantenemos los Bs tal cual se escribieron
                                       const activeRate = getActiveRate();
                                       setNewSale({
                                         ...newSale, 
                                         sharedVes: val, 
                                         sharedVesUsd: (parseFloat(val) / activeRate).toFixed(2)
                                       });
                                     }
                                   }}
                                 />
                                 <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Bs</div>
                               </div>
                             </div>
                             {Number(newSale.sharedVes) > 0 && (
                               <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '0.5rem', fontWeight: '600' }}>
                                 Monto a cobrar: {formatCurrency(newSale.sharedVes, 'VES')}
                               </div>
                             )}
                           </div>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: '1rem', paddingTop: '0.8rem' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                             <span style={{ color: 'var(--text-muted)' }}>Monto en Efectivo:</span>
                             <span style={{ fontWeight: '600' }}>{formatCurrency(Number(newSale.sharedUsd || 0))}</span>
                           </div>
                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                             <span style={{ color: 'var(--text-muted)' }}>Monto en Bolívares ($):</span>
                             <span style={{ fontWeight: '600' }}>{formatCurrency(Number(newSale.sharedVes || 0) / getActiveRate())}</span>
                           </div>
                           
                           {(() => {
                             const activeRate = getActiveRate();
                             const historicalAbono = resumingSaleId ? (sales.find(s => String(s.id) === String(resumingSaleId))?.downPayment || 0) : 0;
                             const currentInputs = (Number(newSale.sharedUsd || 0) + (Number(newSale.sharedVes || 0) / activeRate));
                             const currentTotalToPay = calculateItemTotal(newSale.itemId, newSale.quantity, 'SHARED', Number(newSale.sharedVes) > 0);
                             const totalNow = historicalAbono + currentInputs;
                             
                             return (
                               <>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.8rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)', fontWeight: 'bold' }}>
                                   <span>Total Recibido:</span>
                                   <span style={{ color: totalNow >= currentTotalToPay - 0.01 ? 'var(--success)' : 'var(--warning)' }}>
                                     {formatCurrency(totalNow)}
                                   </span>
                                 </div>
                                 
                                 {totalNow < currentTotalToPay - 0.01 && (
                                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 'bold' }}>
                                       <span>Faltante Actual:</span>
                                       <span>{formatCurrency(Math.max(0, currentTotalToPay - totalNow))}</span>
                                     </div>
                                     
                                     {newSale.status !== 'pending' && (
                                       <button 
                                         type="button"
                                         onClick={() => setNewSale({...newSale, status: 'pending'})}
                                         className="btn"
                                         style={{ 
                                           background: 'rgba(205, 133, 63, 0.1)', 
                                           color: 'var(--warning)', 
                                           border: '1px dashed var(--warning)',
                                           fontSize: '0.75rem',
                                           padding: '0.6rem'
                                         }}
                                       >
                                         <AlertCircle size={14} /> ¿Dejar como Apartado?
                                       </button>
                                     )}
                                   </div>
                                 )}
                               </>
                             );
                           })()}
                         </div>
                      </motion.div>
                    )}

                    {resumingSaleId && (
                      <div className="input-group animate-fade-in" style={{ background: 'rgba(142, 108, 69, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--accent)', gridColumn: '1 / -1' }}>
                        <label style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Pagar ahora:</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <select 
                            value={newSale.installmentsToPay} 
                            onChange={e => setNewSale({...newSale, installmentsToPay: parseInt(e.target.value)})}
                            style={{ flex: 1 }}
                          >
                            {[...Array(Math.max(0, Number(newSale.installments || 0) - Number(newSale.paidInstallments || 0)))].map((_, i) => (
                              <option key={i+1} value={i+1}>{i+1} Cuota(s)</option>
                            ))}
                          </select>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            de {Number(newSale.installments) - Number(newSale.paidInstallments)} restantes
                          </span>
                        </div>
                      </div>
                    )}

                    {!resumingSaleId && newSale.status === 'pending' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid-2-cols" style={{ marginTop: 0 }}>
                        <div className="input-group">
                          <label>Cuotas</label>
                          <select 
                            value={newSale.installments} 
                            onChange={e => setNewSale({...newSale, installments: parseInt(e.target.value)})}
                          >
                            {[2,3,4,5,6].map(n => (
                              <option key={n} value={n}>{n} Cuotas</option>
                            ))}
                          </select>
                        </div>
                        {newSale.paymentMethod !== 'SHARED' && (
                           <div className="input-group">
                             <label>Paga (USD)</label>
                             <input 
                               type="number" 
                               step="0.01"
                               value={newSale.downPayment} 
                               onChange={e => setNewSale({...newSale, downPayment: e.target.value})}
                               placeholder="0.00"
                             />
                           </div>
                         )}
                      </motion.div>
                    )}

                    {newSale.itemId && (
                      <div className="premium-card" style={{ background: 'rgba(255,255,255,0.02)', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span>Total a pagar:</span>
                            {((newSale.paymentMethod === 'VES') || (newSale.paymentMethod === 'SHARED' && (Number(newSale.sharedVes) / getActiveRate()) >= 1)) && (
                               <div style={{ display: 'flex', gap: '0.5rem' }}>
                                 <button type="button" onClick={() => setShowQrModal(true)} className="btn-icon" title="Ver QR">
                                   <QrCode size={18} />
                                 </button>
                                 <button type="button" onClick={copyPaymentData} className="btn-icon" title="Copiar Datos">
                                   <Copy size={18} />
                                 </button>
                               </div>
                             )}
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
                              {(() => {
                                const activeRate = getActiveRate();
                                const totalUsd = calculateItemTotal(newSale.itemId, newSale.quantity, newSale.paymentMethod, Number(newSale.sharedVes) > 0);
                                const originalPriceTotal = (inventory.find(i => i.id === newSale.itemId)?.priceUsd || 0) * newSale.quantity;
                                const isPromoActive = totalUsd < originalPriceTotal;
                                const totalVes = totalUsd * activeRate;

                                if (newSale.paymentMethod === 'USD' || newSale.paymentMethod === 'SHARED') {
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                      {isPromoActive && (
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                                          {formatCurrency(originalPriceTotal)}
                                        </span>
                                      )}
                                      <span style={{ fontWeight: 'bold', fontSize: '1.4rem', color: 'var(--success)' }}>
                                        {formatCurrency(totalUsd)}
                                      </span>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                      {isPromoActive && (
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                                          {formatCurrency(originalPriceTotal * activeRate, 'VES')}
                                        </span>
                                      )}
                                      <span style={{ fontWeight: 'bold', fontSize: '1.4rem', color: 'var(--success)' }}>
                                        {formatCurrency(totalVes, 'VES')}
                                      </span>
                                    </div>
                                  );
                                }
                              })()}
                            </span>
                            
                            {(newSale.paymentMethod === 'USD' || (newSale.paymentMethod === 'SHARED' && Number(newSale.sharedVes) === 0)) && calculateItemTotal(newSale.itemId, newSale.quantity, newSale.paymentMethod, Number(newSale.sharedVes) > 0) < ((inventory.find(i => i.id === newSale.itemId)?.priceUsd || 0) * newSale.quantity) && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 'bold', marginTop: '0.2rem' }}>
                                <Percent size={12} /> Descuento aplicado (Bundle)
                              </div>
                            )}

                            {(() => {
                               const activeRate = getActiveRate();
                               const historicalAbono = resumingSaleId ? (sales.find(s => String(s.id) === String(resumingSaleId))?.downPayment || 0) : 0;
                               const currentNewAbono = newSale.paymentMethod === 'SHARED' 
                                 ? (Number(newSale.sharedUsd || 0) + (Number(newSale.sharedVes || 0) / activeRate))
                                 : Number(newSale.downPayment || 0);
                               const totalPaidSoFar = historicalAbono + currentNewAbono;
                               
                               if (totalPaidSoFar <= 0 && newSale.status !== 'pending') return null;

                               return (
                                 <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px dashed var(--border)' }}>
                                   {historicalAbono > 0 && (
                                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                       <span>Abono Registrado:</span>
                                       <span>{formatCurrency(historicalAbono)}</span>
                                     </div>
                                   )}
                                   {currentNewAbono > 0 && (
                                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--success)', marginBottom: '0.3rem' }}>
                                       <span>Pagando Ahora:</span>
                                       <span>{formatCurrency(currentNewAbono)}</span>
                                     </div>
                                   )}
                                   {(resumingSaleId || newSale.status === 'pending') && (
                                     <>
                                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--warning)', fontWeight: 'bold', marginTop: '0.5rem' }}>
                                         <span>Saldo Pendiente:</span>
                                         <span>{formatCurrency(Math.max(0, calculateItemTotal(newSale.itemId, newSale.quantity, newSale.paymentMethod, Number(newSale.sharedVes) > 0) - totalPaidSoFar))}</span>
                                       </div>
                                       {newSale.installments > 1 && (
                                         <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.3rem', color: 'var(--text-muted)' }}>
                                           <span>{newSale.installments} cuotas de:</span>
                                           <span>{formatCurrency(Math.max(0, calculateItemTotal(newSale.itemId, newSale.quantity, newSale.paymentMethod, Number(newSale.sharedVes) > 0) - totalPaidSoFar) / newSale.installments)} c/u</span>
                                         </div>
                                       )}
                                     </>
                                   )}
                                 </div>
                               );
                             })()}
                          </div>
                        </div>


                        
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '1rem' }}>
                          Tasa aplicada: {formatCurrency(rate, 'VES')}
                        </div>
                      </div>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                      Confirmar Venta
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="premium-card">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <History size={20} /> Ventas Recientes
                </h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Vendedor</th>
                        <th>Cliente</th>
                        <th>Prenda</th>
                        <th>Cant.</th>
                        <th>Total USD</th>
                        <th>Total VES / Pago</th>
                        <th>Estado</th>
                        <th style={{ width: '80px' }}>Acciones</th>
                      </tr>

                    </thead>
                    <tbody>
                      {sales.slice().reverse().map(sale => (
                        <tr key={sale.id}>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {new Date(sale.date).toLocaleDateString()}
                          </td>
                          <td style={{ fontWeight: '600', fontSize: '0.8rem', color: 'var(--accent)' }}>
                            {sale.sellerName?.split(' ')[0] || 'N/A'}
                          </td>
                          <td style={{ fontWeight: '500' }}>
                            <div>{sale.customerName}</div>
                            {sale.customerID && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {sale.customerID}</div>}
                            {sale.customerPhone && <div style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>Tel: {sale.customerPhone}</div>}
                          </td>

                          <td style={{ color: 'var(--text-muted)' }}>{sale.itemName}</td>
                          <td>{sale.quantity}</td>
                          <td>{formatCurrency(sale.totalUsd)}</td>
                          <td>
                            <div style={{ fontSize: '0.9rem' }}>{formatCurrency(sale.totalVes, 'VES')}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>
                              via {sale.paymentMethod === 'SHARED' ? `$${sale.sharedUsd} + Bs.${sale.sharedVes}` : sale.paymentMethod}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${sale.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                              {sale.status === 'paid' ? 'Pagado' : 'Pendiente'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => {
                                  setSelectedReceipt(sale)
                                  setShowReceiptModal(true)
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px' }}
                                title="Ver Recibo"
                              >
                                <QrCode size={18} />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedReceipt(sale)
                                  setShowDeliveryModal(true)
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary-glow)', cursor: 'pointer', padding: '4px' }}
                                title="Nota de Entrega"
                              >
                                <Truck size={16} />
                              </button>
                              <button 
                                onClick={() => deleteSale(sale.id)}
                                style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '4px' }}
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'installments' && (
            <motion.div key="installments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="premium-card">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CreditCard size={20} /> Ventas Por Partes / Pendientes
                </h3>
                <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                  {sales.filter(s => s.status === 'pending').length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No hay cobros pendientes
                    </div>
                  ) : (
                    sales.filter(s => s.status === 'pending').map(sale => (
                      <div key={sale.id} className="premium-card" style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '4px solid var(--warning)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <div>
                            <h4 style={{ color: 'var(--accent)' }}>{sale.customerName}</h4>
                            {sale.customerPhone && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--primary-glow)', display: 'flex', alignItems: 'center', gap: '4px', margin: '2px 0' }}>
                                <Share2 size={12} /> {sale.customerPhone}
                              </p>
                            )}
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>

                              {sale.itemName} x{sale.quantity} • <span style={{ color: 'var(--primary-glow)' }}>{sale.paidInstallments || 0} de {sale.installments} Pagadas</span>
                            </p>
                          </div>
                          <Clock size={16} color="var(--warning)" />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', marginTop: '0.5rem' }}>
                            <span color="var(--text-muted)">Total Pendiente:</span>
                            <span style={{ fontWeight: '700', color: 'var(--warning)' }}>{formatCurrency(sale.totalUsd - sale.downPayment)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--accent)' }}>
                            <span>En Bs. (Hoy):</span>
                            <span>{formatCurrency((sale.totalUsd - sale.downPayment) * rate, 'VES')}</span>
                          </div>
                          {sale.downPayment > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--success)' }}>
                              <span>Pagado hoy:</span>
                              <span>{formatCurrency(sale.downPayment)}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem' }}>
                            <span>{sale.installments} cuotas de:</span>
                            <span>{formatCurrency((sale.totalUsd - sale.downPayment) / sale.installments)}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                          Registrado el: {new Date(sale.date).toLocaleString()}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '0.75rem' }}>
                          <button 
                            onClick={() => {
                              setSelectedReceipt(sale)
                              setShowReceiptModal(true)
                            }}
                            className="btn-secondary" 
                            style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <QrCode size={14} /> Recibo
                          </button>
                          <button 
                            onClick={() => handleWhatsAppShare(sale)}
                            className="btn btn-primary" 
                            style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', background: 'var(--success)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <Share2 size={14} /> WhatsApp
                          </button>
                        </div>
                        <button 
                          onClick={() => resumePendingSale(sale)}
                          className="btn btn-primary" 
                          style={{ width: '100%', fontSize: '0.85rem', background: 'linear-gradient(135deg, var(--accent), var(--primary))' }}
                        >
                          <History size={16} /> Retomar Cobro / Completar
                        </button>

                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid-layout">
                <div className="premium-card" style={{ minHeight: '400px' }}>
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={20} /> Ventas por Prenda ($)
                  </h3>
                  <div style={{ width: '100%', height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.values(sales.reduce((acc, s) => {
                        acc[s.itemName] = acc[s.itemName] || { name: s.itemName, total: 0 };
                        acc[s.itemName].total += s.totalUsd;
                        return acc;
                      }, {}))}>
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                        <Tooltip 
                          contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px' }}
                          itemStyle={{ color: 'var(--primary)' }}
                        />
                        <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                          {sales.length > 0 && Object.values(sales.reduce((acc, s) => {
                            acc[s.itemName] = acc[s.itemName] || { name: s.itemName, total: 0 };
                            acc[s.itemName].total += s.totalUsd;
                            return acc;
                          }, {})).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--primary)' : 'var(--primary-glow)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="premium-card" style={{ minHeight: '400px' }}>
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={20} /> Ventas por Día ($)
                  </h3>
                  <div style={{ width: '100%', height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={Object.values(sales.reduce((acc, s) => {
                        const day = new Date(s.date).toLocaleDateString();
                        acc[day] = acc[day] || { date: day, total: 0 };
                        acc[day].total += s.totalUsd;
                        return acc;
                      }, {})).sort((a,b) => new Date(a.date) - new Date(b.date))}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                        <Tooltip 
                          contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px' }}
                        />
                        <Area type="monotone" dataKey="total" stroke="var(--primary)" fillOpacity={1} fill="url(#colorTotal)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="premium-card" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Análisis de Rendimiento</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ticket Promedio</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>
                      {formatCurrency(sales.length > 0 ? sales.reduce((acc, s) => acc + s.totalUsd, 0) / sales.length : 0)}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Prenda más Vendida</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                      {sales.length > 0 ? Object.entries(sales.reduce((acc, s) => {
                        acc[s.itemName] = (acc[s.itemName] || 0) + s.quantity;
                        return acc;
                      }, {})).sort((a,b) => b[1] - a[1])[0][0] : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Efectividad de Pagos</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>
                      {sales.length > 0 ? Math.round((sales.filter(s => s.status === 'paid').length / sales.length) * 100) : 0}% Pagado
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'calc' && (
            <motion.div key="calc" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="calculator-container premium-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calculator size={22} color="var(--primary-glow)" /> {calcMode === 'financial' ? 'Calculadora Global' : 'Calculadora Estándar'}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <div style={{ 
                      display: 'flex', 
                      background: 'rgba(142, 108, 69, 0.05)', 
                      padding: '4px', 
                      borderRadius: '10px', 
                      border: '1px solid var(--border)',
                      marginRight: '0.5rem'
                    }}>
                      <button 
                        onClick={() => setCalcMode('financial')}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: calcMode === 'financial' ? 'var(--primary-glow)' : 'transparent',
                          color: calcMode === 'financial' ? 'white' : 'var(--text-muted)',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Financiera
                      </button>
                      <button 
                        onClick={() => setCalcMode('normal')}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: calcMode === 'normal' ? 'var(--primary-glow)' : 'transparent',
                          color: calcMode === 'normal' ? 'white' : 'var(--text-muted)',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Normal
                      </button>
                    </div>
                    <button 
                      className="btn-icon" 
                      title="Copiar Valor"
                      onClick={() => {
                        navigator.clipboard.writeText(calcVal);
                        alert("Copiado: " + calcVal);
                      }}
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      className="btn-icon" 
                      title="Limpiar Todo"
                      onClick={clearCalc}
                    >
                      <Trash2 size={16} color="var(--danger)" />
                    </button>
                  </div>
                </div>

                {calcMode === 'financial' && (
                  <div className="calc-rates">
                    <div 
                      className={`rate-badge ${calcRateType === 'bcv' ? 'active' : ''}`}
                      onClick={() => setCalcRateType('bcv')}
                    >
                      <label>BCV (Oficial)</label>
                      <span>{formatCurrency(rateBcv, 'VES')}</span>
                    </div>
                    <div 
                      className={`rate-badge ${calcRateType === 'euro' ? 'active' : ''}`}
                      onClick={() => setCalcRateType('euro')}
                    >
                      <label>Euro</label>
                      <span>{formatCurrency(rateEuro, 'VES')}</span>
                    </div>
                    <div 
                      className={`rate-badge ${calcRateType === 'binance' ? 'active' : ''}`}
                      onClick={() => setCalcRateType('binance')}
                    >
                      <label>Binance</label>
                      <span>{formatCurrency(rate, 'VES')}</span>
                    </div>
                  </div>
                )}

                <div className="calc-display" style={{ marginBottom: '1.5rem' }}>
                  <div className="calc-history">{calcHistory}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      {calcMode === 'financial' ? (calcRateType || 'BCV').toUpperCase() : 'MODO ESTÁNDAR'}
                    </span>
                    <div className="calc-main-num">{calcVal}</div>
                  </div>
                </div>

                {calcMode === 'financial' && (
                  <>
                    <div className="calc-actions-row">
                      <button className="calc-extra-btn" onClick={() => {
                        const currentRate = calcRateType === 'bcv' ? rateBcv : (calcRateType === 'euro' ? rateEuro : rate);
                        setCalcVal((parseFloat(calcVal) * currentRate).toFixed(2));
                      }}>
                        <DollarSign size={14} /> a Bs.
                      </button>
                      <button className="calc-extra-btn" onClick={() => {
                        const currentRate = calcRateType === 'bcv' ? rateBcv : (calcRateType === 'euro' ? rateEuro : rate);
                        setCalcVal((parseFloat(calcVal) / currentRate).toFixed(2));
                      }}>
                        <TrendingUp size={14} /> a $
                      </button>
                    </div>

                    <div className="calc-actions-row" style={{ marginBottom: '1.5rem' }}>
                      {[5, 10, 20, 50].map(bill => (
                        <button key={bill} className="calc-extra-btn" style={{ fontSize: '0.75rem' }} onClick={() => {
                          if (calcVal === '0' || shouldReset) {
                            setCalcVal(String(bill));
                            setShouldReset(false);
                          } else {
                            setCalcVal(String(parseFloat(calcVal) + bill));
                          }
                        }}>
                          +${bill}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="calc-grid">
                  <button className="calc-btn clear" onClick={clearCalc}>AC</button>
                  <button className="calc-btn op" onClick={() => setCalcVal(calcVal.length > 1 ? calcVal.slice(0, -1) : '0')}>
                    <X size={18} />
                  </button>
                  <button className="calc-btn op" style={{ fontSize: '1.5rem' }} onClick={() => handleCalcOp('/')}>÷</button>
                  <button className="calc-btn op" style={{ fontSize: '1.5rem' }} onClick={() => handleCalcOp('*')}>×</button>
                  
                  {[7, 8, 9].map(n => <button key={n} className="calc-btn" onClick={() => handleCalcInput(n)}>{n}</button>)}
                  <button className="calc-btn op" style={{ fontSize: '1.5rem' }} onClick={() => handleCalcOp('-')}>−</button>
                  
                  {[4, 5, 6].map(n => <button key={n} className="calc-btn" onClick={() => handleCalcInput(n)}>{n}</button>)}
                  <button className="calc-btn op" style={{ fontSize: '1.5rem' }} onClick={() => handleCalcOp('+')}>+</button>
                  
                  {[1, 2, 3].map(n => <button key={n} className="calc-btn" onClick={() => handleCalcInput(n)}>{n}</button>)}
                  <button className="calc-btn action" style={{ gridRow: 'span 2', height: '128px' }} onClick={handleCalcEqual}>=</button>
                  
                  <button className="calc-btn" style={{ gridColumn: 'span 2' }} onClick={() => handleCalcInput(0)}>0</button>
                  <button className="calc-btn" onClick={() => handleCalcInput('.')}>.</button>
                </div>

                {calcMode === 'financial' && parseFloat(calcVal) > 0 && (
                  <div className="calc-conversion animate-fade-in" style={{ flexDirection: 'column', gap: '0.8rem', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="label" style={{ color: 'var(--primary-glow)' }}>Si son Dólares ($):</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tasa {calcRateType.toUpperCase()}</div>
                      </div>
                      <div className="value" style={{ color: 'var(--primary-glow)' }}>
                        {formatCurrency(parseFloat(calcVal) * (calcRateType === 'bcv' ? rateBcv : (calcRateType === 'euro' ? rateEuro : rate)), 'VES')}
                      </div>
                    </div>
                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="label" style={{ color: 'var(--success)' }}>Si son Bolívares (Bs):</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tasa {calcRateType.toUpperCase()}</div>
                      </div>
                      <div className="value" style={{ color: 'var(--success)' }}>
                        {formatCurrency(parseFloat(calcVal) / (calcRateType === 'bcv' ? rateBcv : (calcRateType === 'euro' ? rateEuro : rate)), 'USD')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid-layout">
                <div className="premium-card">
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Copy size={20} /> Nueva Nota Pendiente
                  </h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!newNote.title || !newNote.text) return;
                    setNotes([{ id: Date.now().toString(), ...newNote, author: user?.displayName || 'Vendedor', date: new Date().toISOString() }, ...notes]);
                    setNewNote({ title: '', text: '' });
                  }}>
                    <div className="input-group">
                      <label>Título</label>
                      <input 
                        type="text" 
                        value={newNote.title} 
                        onChange={e => setNewNote({...newNote, title: e.target.value})}
                        placeholder="Ej. Realizar pedido de suéteres..."
                        required
                      />
                    </div>
                    <div className="input-group" style={{ height: 'auto', minHeight: '120px' }}>
                      <label>Detalle Pendiente</label>
                      <textarea 
                        value={newNote.text} 
                        onChange={e => setNewNote({...newNote, text: e.target.value})}
                        placeholder="Escribe la descripción completa aquí..."
                        rows={4}
                        style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--glass-border)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.7)', fontFamily: "'Outfit', sans-serif" }}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                      Guardar Nota
                    </button>
                  </form>
                </div>

                <div className="premium-card">
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ClipboardList size={20} /> Lista de Pendientes
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {notes.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay notas pendientes actuales.</p>
                    ) : (
                      notes.map(note => (
                        <div key={note.id} style={{ padding: '1.25rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ margin: 0, color: 'var(--accent)', fontSize: '1rem' }}>{note.title}</h4>
                            <button 
                              onClick={() => setNotes(notes.filter(n => n.id !== note.id))}
                              style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '0.2rem' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#4A3728', whiteSpace: 'pre-wrap' }}>{note.text}</p>
                          <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Autor: {note.author || 'Vendedor'} | {new Date(note.date).toLocaleString()}</small>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showQrModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="premium-card modal-content"
              style={{ maxWidth: '400px', textAlign: 'center', background: 'white', color: '#333' }}
            >
              <button 
                onClick={() => setShowQrModal(false)} 
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
              >
                <X size={24} />
              </button>
              <h3 style={{ color: '#8E6C45', marginBottom: '1rem' }}>Pago Móvil Mercantil</h3>
              <div style={{ background: '#f8f8f8', padding: '1rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('Pago Movil Mercantil: 04142378679 CI: 24901796')}`} 
                  alt="QR Pago Movil" 
                  style={{ width: '200px', height: '200px', marginBottom: '1rem' }}
                />
                <div style={{ textAlign: 'left', fontSize: '0.9rem' }}>
                  <p><strong>Tel:</strong> 04142378679</p>
                  <p><strong>CI:</strong> 24901796</p>
                  <p><strong>Banco:</strong> Mercantil</p>
                  <hr style={{ margin: '0.5rem 0', opacity: 0.1 }} />
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center', color: 'var(--primary-glow)' }}>
                    Total Cobrar: {formatCurrency(newSale.paymentMethod === 'SHARED' ? newSale.sharedVes : calculateItemTotal(newSale.itemId, newSale.quantity, 'VES', true), 'VES')}
                    <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '4px' }}>Tasa Aplicada: {(newSale.rateType || 'BCV').toUpperCase()} ({formatCurrency(getActiveRate(), 'VES')})</div>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1.5rem' }}>Verifique el pago antes de continuar</p>
              <button onClick={registerSale} className="btn btn-primary" style={{ width: '100%' }}>
                Pago Confirmado - Registrar Venta
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showIgModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="premium-card modal-content"
              style={{ maxWidth: '400px', textAlign: 'center', background: 'white', color: '#333' }}
            >
              <button 
                onClick={() => setShowIgModal(false)} 
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
              >
                <X size={24} />
              </button>
              <h3 style={{ color: '#E4405F', marginBottom: '1rem' }}>Síguenos en Instagram</h3>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>Escanea el código para ver nuestra colección en vivo</p>
              
              <div style={{ background: '#f8f8f8', padding: '1.5rem', borderRadius: '24px', marginBottom: '1.5rem', display: 'inline-block' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent('https://www.instagram.com/outlet_caricuao?igsh=ZjB6OWgydTFiNWxk&utm_source=qr')}`} 
                  alt="IG QR Code" 
                  style={{ width: '250px', height: '250px', borderRadius: '12px' }}
                />
              </div>
              
              <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#E4405F', marginBottom: '0.5rem' }}>
                @outlet_caricuao
              </div>
              
              <button onClick={() => setShowIgModal(false)} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', background: 'linear-gradient(45deg, #f09433, #bc1888)' }}>
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReceiptModal && selectedReceipt && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="modal-overlay no-print"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="premium-card modal-content receipt-modal"
              style={{ maxWidth: '450px', padding: '0' }}
            >
              <div className="receipt-container" id="printable-receipt" style={{ padding: '2rem', background: 'white', color: '#333', borderRadius: '16px' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <img src="/logo.jpg" alt="Logo" style={{ width: '80px', borderRadius: '50%', marginBottom: '0.5rem' }} />
                  <h2 style={{ color: '#8E6C45', margin: '0' }}>OUTLET CARICUAO</h2>
                  <p style={{ margin: '0', fontSize: '0.9rem' }}>Inversiones Caricuao F.P.</p>
                  <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: '0' }}>RIF: V-24901796-0</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                  <span>RECIBO DE PAGO</span>
                  <span>#{selectedReceipt.id.slice(-6)}</span>
                </div>
                
                <div className="grid-2-cols" style={{ gap: '0.75rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#888' }}>Cliente:</label>
                    <strong>{selectedReceipt.customerName}</strong>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#888' }}>ID/Cédula:</label>
                    <strong>{selectedReceipt.customerID || 'N/A'}</strong>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#888' }}>Fecha:</label>
                    <strong>{new Date(selectedReceipt.date).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#888' }}>Teléfono:</label>
                    <strong>{selectedReceipt.customerPhone || 'N/A'}</strong>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <thead style={{ borderBottom: '1px solid #eee' }}>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0' }}>Descripción</th>
                      <th>Cant.</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '0.5rem 0' }}>{selectedReceipt.itemName}</td>
                      <td>{selectedReceipt.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(selectedReceipt.totalUsd)}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ borderTop: '1px dashed #ccc', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Total USD</span>
                    <strong>{formatCurrency(selectedReceipt.totalUsd)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8E6C45' }}>
                    <span>Total Bs.</span>
                    <strong>{formatCurrency(selectedReceipt.totalVes, 'VES')}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>
                    Tasa: {formatCurrency(selectedReceipt.rate, 'VES')} ({selectedReceipt.rateType?.toUpperCase()})
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>
                    Método de Pago: {selectedReceipt.paymentMethod}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                    Atendido por: {selectedReceipt.sellerName || 'Caja Central'}
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: '#888' }}>
                  <p>¡Gracias por tu compra!</p>
                  <p style={{ fontSize: '0.65rem' }}>No se aceptan cambios ni devoluciones sin el recibo correspondiente.</p>
                </div>
              </div>

              <div className="modal-actions no-print" style={{ padding: '1.5rem', display: 'flex', gap: '0.5rem', background: '#fcfcfc', flexWrap: 'wrap' }}>
                <button onClick={handlePrint} className="btn-secondary" style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  Imprimir / PDF
                </button>
                <button 
                  onClick={() => handleWhatsAppShare(selectedReceipt)} 
                  className="btn btn-primary" 
                  style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--success)', border: 'none' }}
                >
                  <Share2 size={18} /> WhatsApp
                </button>
                <button 
                  onClick={() => { setShowReceiptModal(false); setShowDeliveryModal(true) }} 
                  className="btn btn-primary"
                  style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--accent)', border: 'none' }}
                >
                  <Truck size={18} /> Nota de Entrega
                </button>
                <button onClick={() => setShowReceiptModal(false)} className="btn-secondary" style={{ flex: '0 0 auto', padding: '0.75rem' }}>
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ NOTA DE ENTREGA MODAL ============ */}
      <AnimatePresence>
        {showDeliveryModal && selectedReceipt && (() => {
          const s = selectedReceipt
          const isPending = s.status === 'pending'
          const isShared = s.paymentMethod === 'SHARED'
          const isVes = s.paymentMethod === 'VES'
          const notaNum = String(s.id).slice(-6).toUpperCase()
          const cuotaRestante = isPending ? (s.totalUsd - s.downPayment) : 0
          const cuotaValor = isPending ? (cuotaRestante / Math.max(s.installments - s.paidInstallments, 1)) : 0
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay no-print"
            >
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                style={{ width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}
                id="delivery-note-root"
              >
                {/* ─── Printable area ─── */}
                <div id="printable-delivery" style={{ background: 'white', color: '#333', padding: '2rem 2.5rem', fontFamily: "'Outfit', sans-serif" }}>

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderBottom: '3px solid #8E6C45', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                    <img src="/logo.jpg" alt="Logo" style={{ width: '68px', height: '68px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #C2A888', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8E6C45', letterSpacing: '-0.02em' }}>OUTLET CARICUAO</div>
                      {/* Instagram QR */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent('https://www.instagram.com/outlet_caricuao?igsh=ZjB6OWgydTFiNWxk')}`}
                          alt="IG QR"
                          style={{ width: '46px', height: '46px', borderRadius: '4px' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#aaa' }}>@outlet_caricuao</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#4A3728', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nota de Entrega</div>
                      <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>#{notaNum}</div>
                      <div style={{ fontSize: '0.8rem', color: '#999' }}>{new Date(s.date).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Customer info grid */}
                  <div className="grid-2-cols" style={{ border: '1px solid #f0e8df', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.25rem', gap: 0 }}>
                    {[
                      ['Cliente', s.customerName],
                      ['Cédula', s.customerID || 'N/A'],
                      ['Teléfono', s.customerPhone || 'N/A'],
                      ['Email', s.customerEmail || 'N/A'],
                    ].map(([label, val], i) => (
                      <div key={i} style={{ padding: '0.55rem 1rem', borderBottom: '1px solid #f8f0ea', borderRight: i % 2 === 0 ? '1px solid #f8f0ea' : 'none', display: 'flex', gap: '0.5rem', alignItems: 'center', background: i % 4 < 2 ? '#fdfaf7' : 'white' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8E6C45', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: '68px' }}>{label}</span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#4A3728' }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Payment detail box */}
                  <div style={{ background: '#fdf9f5', border: '1px solid #e8ddd4', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8E6C45', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>Detalle de Pago</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8E6C45', textTransform: 'uppercase' }}>Total USD</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4A3728' }}>{formatCurrency(s.totalUsd)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8E6C45', textTransform: 'uppercase' }}>Total Bs.</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#8E6C45' }}>{formatCurrency(s.totalVes, 'VES')}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8E6C45', textTransform: 'uppercase' }}>Tasa {s.rateType?.toUpperCase()}</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#666' }}>{formatCurrency(s.rate, 'VES')}</div>
                      </div>
                    </div>

                    {/* Shared payment breakdown */}
                    {isShared && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center', borderTop: '1px dashed #e0d0c0', marginTop: '0.6rem', paddingTop: '0.6rem' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8E6C45', textTransform: 'uppercase' }}>Pagado en $</div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4A3728' }}>{formatCurrency(s.sharedUsd)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8E6C45', textTransform: 'uppercase' }}>Pagado en Bs.</div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#8E6C45' }}>{formatCurrency(s.sharedVes, 'VES')}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8E6C45', textTransform: 'uppercase' }}>Bs. → USD</div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#666' }}>{formatCurrency(s.sharedVes / s.rate)}</div>
                        </div>
                      </div>
                    )}

                    {/* Installments */}
                    {isPending && (
                      <div style={{ borderTop: '1px dashed #e0d0c0', marginTop: '0.6rem', paddingTop: '0.6rem', fontSize: '0.8rem', color: '#b8740a', fontWeight: 600, textAlign: 'center' }}>
                        ⏳ Pago por Partes · Abono: {formatCurrency(s.downPayment)} · Resta: {formatCurrency(cuotaRestante)} en {Math.max(s.installments - s.paidInstallments, 1)} cuota(s) de {formatCurrency(cuotaValor)}
                      </div>
                    )}

                    <div style={{ borderTop: '1px dashed #e0d0c0', marginTop: '0.6rem', paddingTop: '0.5rem', fontSize: '0.75rem', color: '#aaa', textAlign: 'center' }}>
                      <strong style={{ color: '#8E6C45' }}>Método: </strong>
                      {s.paymentMethod === 'USD' ? 'Dólares en Efectivo' : s.paymentMethod === 'VES' ? 'Bolívares (Pago Móvil / Transferencia)' : s.paymentMethod === 'SHARED' ? 'Pago Compartido ($ + Bs.)' : s.paymentMethod}
                      {' · '}
                      <strong style={{ color: s.status === 'paid' ? '#6B8E23' : '#b8740a' }}>
                        {s.status === 'paid' ? '✔ Cancelado' : '⏳ Pendiente'}
                      </strong>
                    </div>
                  </div>

                  {/* Items table */}
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8E6C45', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Artículos Entregados</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem' }}>
                    <thead>
                      <tr style={{ background: '#8E6C45' }}>
                        {['Descripción', 'Cant.', 'Precio Unit.', 'Total USD'].map(h => (
                          <th key={h} style={{ padding: '0.5rem 0.8rem', fontSize: '0.7rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', textAlign: h === 'Total USD' ? 'right' : 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '0.55rem 0.8rem', borderBottom: '1px solid #f0e8df', fontSize: '0.88rem', color: '#4A3728' }}>{s.itemName}</td>
                        <td style={{ padding: '0.55rem 0.8rem', borderBottom: '1px solid #f0e8df', fontSize: '0.88rem' }}>{s.quantity}</td>
                        <td style={{ padding: '0.55rem 0.8rem', borderBottom: '1px solid #f0e8df', fontSize: '0.88rem' }}>{formatCurrency(s.priceUsd)}</td>
                        <td style={{ padding: '0.55rem 0.8rem', borderBottom: '1px solid #f0e8df', fontSize: '0.88rem', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(s.totalUsd)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'right', paddingTop: '0.6rem', paddingRight: '0.8rem', fontSize: '0.88rem', fontWeight: 700, color: '#4A3728', borderTop: '2px dashed #e0d0c0' }}>Total USD:</td>
                        <td style={{ textAlign: 'right', paddingTop: '0.6rem', fontSize: '0.95rem', fontWeight: 800, color: '#4A3728', borderTop: '2px dashed #e0d0c0' }}>{formatCurrency(s.totalUsd)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'right', paddingRight: '0.8rem', fontSize: '0.85rem', fontWeight: 700, color: '#8E6C45' }}>Total Bs.:</td>
                        <td style={{ textAlign: 'right', fontSize: '0.9rem', fontWeight: 800, color: '#8E6C45' }}>{formatCurrency(s.totalVes, 'VES')}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Footer */}
                  <div style={{ borderTop: '1px dashed #e0d0c0', paddingTop: '0.65rem', textAlign: 'center', fontSize: '0.7rem', color: '#bbb' }}>
                    <div style={{ marginBottom: '0.2rem', color: '#888' }}>Atendido por: {s.sellerName || 'Caja Central'}</div>
                    <strong style={{ color: '#8E6C45' }}>Outlet Caricuao</strong> · Este documento certifica la entrega. · No se aceptan cambios sin este comprobante.
                  </div>
                </div>

                {/* ─── Action buttons (no-print) ─── */}
                <div className="no-print" style={{ background: '#fcfcfc', padding: '1.25rem 1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid #f0e8df' }}>
                  <button
                    onClick={() => window.print()}
                    className="btn-secondary"
                    style={{ flex: 1, minWidth: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    🖨️ Imprimir / PDF
                  </button>
                  <button
                    onClick={() => handleWhatsAppShare(s)}
                    className="btn btn-primary"
                    style={{ flex: 1, minWidth: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#25D366', border: 'none' }}
                  >
                    <Share2 size={18} /> WhatsApp
                  </button>
                  <button
                    onClick={() => setShowDeliveryModal(false)}
                    className="btn-secondary"
                    style={{ flex: '0 0 auto', padding: '0.75rem' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

    </div>
  )
}


function StatCard({ title, value, icon, color = 'var(--accent)' }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="premium-card" 
      style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
        {icon} {title}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: color }}>
        {value}
      </div>
    </motion.div>
  )
}

export default App
