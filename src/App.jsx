import { useState, useEffect, useRef } from 'react'
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
  ClipboardList,
  LogOut,
  LogIn,
  Mail,
  Lock,
  User,
  TrendingDown,
  Pencil,
  Check
} from 'lucide-react'

import { auth, googleProvider, db } from './firebase'
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth'
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  where,
  updateDoc
} from 'firebase/firestore'



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


  const [rate, setRate] = useState(0) // Tasa Binance (Paralelo)
  const [rateBcv, setRateBcv] = useState(0)
  const [rateEuro, setRateEuro] = useState(0)
  const [user, setUser] = useState(null)
  const isInitialPresence = useRef(true)
  const prevSellersRef = useRef([]) // Guardamos los objetos completos para tener los nombres
  const [activeSellers, setActiveSellers] = useState([])
  const [inventory, setInventory] = useState([])
  const [sales, setSales] = useState([])
  const [promotions, setPromotions] = useState([])
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState({ title: '', text: '' })
  const [expenses, setExpenses] = useState([])
  const [newExpense, setNewExpense] = useState({ concept: '', amountUsd: '' })
  
  const [toast, setToast] = useState(null)
  
  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

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

  const btnStyle = (type) => {
    const base = {
      padding: '0',
      borderRadius: '16px',
      border: 'none',
      fontSize: '1.5rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.12s ease',
      height: '65px',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
    if (type === 'clear')  return { ...base, background: '#f8d7c4', color: '#8E3E00', fontSize: '1.2rem' };
    if (type === 'op')     return { ...base, background: 'rgba(142,108,69,0.15)', color: 'var(--primary-glow)' };
    if (type === 'eq')     return { ...base, background: 'var(--primary-glow)', color: 'white' };
    return { ...base, background: 'rgba(74,55,40,0.07)', color: 'var(--text)' }; // num
  };


  const [newItem, setNewItem] = useState({ name: '', quantity: '', priceUsd: '' })
  const [editingItemId, setEditingItemId] = useState(null)
  const [editItemData, setEditItemData] = useState({ name: '', quantity: 0, priceUsd: 0 })
  const [inventoryRateType, setInventoryRateType] = useState('bcv')
  const [newSale, setNewSale] = useState({ 
    itemId: '', quantity: 1, paymentMethod: 'USD', status: 'paid', customerName: '', 
    installments: 2, downPayment: '', paidInstallments: 0, installmentsToPay: 0,
    sharedUsd: '', sharedVes: '', sharedVesUsd: '', sharedBinance: '',
    customerID: '', customerIDPrefix: 'V', customerPhone: '', customerEmail: '',
    isManualQuantity: false, rateType: 'bcv', cart: []
  })



  useEffect(() => {
    if (!user) {
      setActiveSellers([])
      return
    }

    const sellerRef = doc(db, 'active_sellers', user.uid)
    const updatePresence = async () => {
      try {
        await setDoc(sellerRef, {
          name: user.displayName || user.email.split('@')[0],
          lastActive: serverTimestamp(),
          email: user.email,
          status: 'online',
          photo: user.photoURL || null
        }, { merge: true })
        console.log("Presencia actualizada correctamente");
      } catch (e) {
        console.error("Error actualizando presencia:", e)
        if (e.code === 'permission-denied') {
          console.error("PERMISOS DENEGADOS: Revisa las reglas de Firestore en la consola de Firebase.");
        }
      }
    }

    updatePresence()
    const interval = setInterval(updatePresence, 30000)

    const unsubscribe = onSnapshot(collection(db, 'active_sellers'), (snapshot) => {
      console.log(`[Presence] Docs recibidos: ${snapshot.size}`);
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000) 
      
      const sellers = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => {
          if (s.status !== 'online') return false;
          if (!s.lastActive) return false;
          const ts = s.lastActive.toDate ? s.lastActive.toDate().getTime() : s.lastActive;
          return ts > Date.now() - (2 * 60 * 1000); // Solo 2 minutos de gracia
        })
        .sort((a, b) => a.id === user.uid ? -1 : (b.id === user.uid ? 1 : 0)) 
      
      // Notificar nuevas conexiones
      if (!isInitialPresence.current) {
        sellers.forEach(s => {
          if (s.id !== user.uid && !prevSellersRef.current.find(p => p.id === s.id)) {
            showToast(`👤 ${s.name} se ha conectado`, "info");
          }
        });

        // Notificar desconexiones
        prevSellersRef.current.forEach(p => {
          if (p.id !== user.uid && !sellers.find(s => s.id === p.id)) {
            showToast(`🚪 ${p.name} se ha desconectado`, "warning");
          }
        });
      }
      isInitialPresence.current = false;
      prevSellersRef.current = sellers;

      setActiveSellers(sellers)
    }, (error) => {
      console.error("Error en tiempo real (Sellers):", error);
      if (error.code === 'permission-denied') {
        showToast("⚠️ Error de Permisos: No puedes ver a otros vendedores. Revisa tus Reglas de Firestore.", "error");
      }
    })

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [user])

  useEffect(() => {
    // --- FIRESTORE REAL-TIME SYNC ---
    const collectionsList = ['inventory', 'sales', 'expenses', 'promotions', 'notes']
    const unsubscritores = collectionsList.map(colName => {
      let isInitial = true
      return onSnapshot(collection(db, colName), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        
        // --- REAL-TIME NOTIFICATIONS ---
        if (!isInitial) {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              const item = change.doc.data()
              if (item.sellerName && item.sellerName !== (user?.displayName || user?.email?.split('@')[0])) {
                if (colName === 'sales') showToast(`💸 ${item.sellerName} registró una venta de ${item.itemName}`, 'success')
                if (colName === 'expenses') showToast(`📉 ${item.sellerName} registró un gasto: ${item.concept}`, 'warning')
              }
              if (colName === 'inventory' && item.author && item.author !== (user?.displayName || user?.email?.split('@')[0])) {
                showToast(`📦 ${item.author} agregó ${item.name} al stock`, 'info')
              }
            }
          })
        }
        isInitial = false

        if (colName === 'inventory') setInventory(data)
        if (colName === 'sales') setSales(data.sort((a,b) => b.id - a.id))
        if (colName === 'expenses') setExpenses(data.sort((a,b) => b.id - a.id))
        if (colName === 'promotions') setPromotions(data)
        if (colName === 'notes') setNotes(data)
      }, (err) => {
        console.error(`Error sync ${colName}:`, err)
      })
    })

    return () => {
      unsubscritores.forEach(unsub => unsub())
    }
  }, [user])
  const [showQrModal, setShowQrModal] = useState(false)
  const [showIgModal, setShowIgModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [qrSubtype, setQrSubtype] = useState(null)

  const [resumingSaleId, setResumingSaleId] = useState(null)

  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state) {
        if (e.state.tab) setActiveTab(e.state.tab)
        setShowQrModal(e.state.qr || false)
        setShowIgModal(e.state.ig || false)
        setShowReceiptModal(e.state.receipt || false)
        setShowDeliveryModal(e.state.delivery || false)
      }
    }

    window.addEventListener('popstate', handlePopState)
    // Estado inicial
    window.history.replaceState({ tab: activeTab, qr: false, ig: false, receipt: false, delivery: false }, '')

    return () => window.removeEventListener('popstate', handlePopState)
  }, [activeTab]) // Added dependency just in case

  const handleTabChange = (tab) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    window.history.pushState({ tab: tab, qr: false, ig: false, receipt: false, delivery: false }, '')
  }

  const openModal = (type, data = null) => {
    if (data) setSelectedReceipt(data)
    
    const newState = { tab: activeTab, qr: false, ig: false, receipt: false, delivery: false }
    if (type === 'qr') { 
      setShowQrModal(true); 
      setQrSubtype(data); 
      newState.qr = true; 
    }
    if (type === 'ig') { setShowIgModal(true); newState.ig = true; }
    if (type === 'receipt') { setShowReceiptModal(true); newState.receipt = true; }
    if (type === 'delivery') { setShowDeliveryModal(true); newState.delivery = true; }
    
    window.history.pushState(newState, '')
  }

  const closeModal = () => {
    window.history.back()
  }

  useEffect(() => {
    fetchRate()
    const interval = setInterval(fetchRate, 300000) // Update every 5 mins
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
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

  useEffect(() => {
    localStorage.setItem('outlet_expenses', JSON.stringify(expenses))
  }, [expenses])

  const [updatingRates, setUpdatingRates] = useState(false)

  const fetchRate = async () => {
    setUpdatingRates(true)
    let successCount = 0
    try {
      // Binance (Paralelo)
      try {
        const resBinance = await fetch('https://ve.dolarapi.com/v1/dolares/paralelo')
        if (resBinance.ok) {
          const dataBinance = await resBinance.json()
          setRate(dataBinance.promedio || dataBinance.price)
          successCount++
        }
      } catch (e) { console.error("Error fetching Binance:", e) }

      // BCV (Oficial)
      try {
        const resBcv = await fetch('https://ve.dolarapi.com/v1/dolares/oficial')
        if (resBcv.ok) {
          const dataBcv = await resBcv.json()
          setRateBcv(dataBcv.promedio || dataBcv.price)
          successCount++
        }
      } catch (e) { console.error("Error fetching BCV:", e) }

      // Euro (Oficial)
      try {
        const resEuro = await fetch('https://ve.dolarapi.com/v1/euros/oficial')
        if (resEuro.ok) {
          const dataEuro = await resEuro.json()
          setRateEuro(dataEuro.promedio || dataEuro.price)
          successCount++
        }
      } catch (e) { console.error("Error fetching Euro:", e) }

      if (successCount > 0) {
        showToast(`Tasas actualizadas (${successCount}/3)`, "success")
      } else {
        showToast("No se pudieron obtener las tasas actualizadas", "warning")
      }
    } catch (error) {
      console.error("General error fetching rates:", error)
      showToast("Error de conexión al actualizar tasas", "error")
    } finally {
      setUpdatingRates(false)
    }
  }


  const addInventory = async (e) => {
    e.preventDefault()
    if (!newItem.name || !newItem.quantity || !newItem.priceUsd) return
    
    const existingIndex = inventory.findIndex(i => i.name.toLowerCase() === newItem.name.toLowerCase())
    
    try {
      if (existingIndex >= 0) {
        const existing = inventory[existingIndex]
        await setDoc(doc(db, 'inventory', existing.id), {
          ...existing,
          quantity: existing.quantity + parseInt(newItem.quantity),
          priceUsd: parseFloat(newItem.priceUsd)
        }, { merge: true })
      } else {
        const id = Date.now().toString()
        await setDoc(doc(db, 'inventory', id), {
          name: newItem.name,
          quantity: parseInt(newItem.quantity),
          priceUsd: parseFloat(newItem.priceUsd),
          author: user?.displayName || user?.email?.split('@')[0] || 'Vendedor'
        })
      }
      setNewItem({ name: '', quantity: '', priceUsd: '' })
    } catch (err) {
      console.error("Error writing inventory:", err)
    }
  }

  const getActiveRate = () => {
    if (newSale.rateType === 'bcv') return rateBcv
    if (newSale.rateType === 'euro') return rateEuro
    return rate
  }

  const addToCart = () => {
    if (!newSale.itemId || !newSale.quantity) return
    
    const item = inventory.find(i => i.id === newSale.itemId)
    if (!item || item.quantity < newSale.quantity) {
      alert("No hay suficiente stock")
      return
    }

    const totalUsd = calculateItemTotal(newSale.itemId, newSale.quantity, newSale.paymentMethod)
    const cartItem = {
      id: Date.now() + Math.random().toString(),
      itemId: newSale.itemId,
      itemName: item.name,
      quantity: parseInt(newSale.quantity),
      priceUsd: totalUsd / newSale.quantity,
      totalUsd
    }

    setNewSale(prev => ({
      ...prev,
      cart: [...prev.cart, cartItem],
      itemId: '',
      quantity: 1,
      isManualQuantity: false
    }))
  }

  const removeFromCart = (id) => {
    setNewSale(prev => ({
      ...prev,
      cart: prev.cart.filter(item => item.id !== id)
    }))
  }

  const getGrandTotal = () => {
    let total = 0;
    const method = newSale.paymentMethod;
    const hasVes = (method === 'VES' || (method === 'SHARED' && Number(newSale.sharedVes) > 0));

    // Si hay carrito, iterar y recalcular por si cambiaron de metodo
    if (newSale.cart.length > 0) {
      total += newSale.cart.reduce((acc, item) => acc + item.priceUsd * item.quantity, 0); 
      // Calculamos usando el priceUsd guardado o llamamos calculateItemTotal.
      // Usar el totalUsd guardado en el carrito es más preciso para no perder promos pre-calculadas:
      total += newSale.cart.reduce((acc, item) => acc + item.totalUsd, 0) - total; 
    }
    
    // Si hay un item seleccionado, sumarlo a la factura
    if (newSale.itemId && newSale.quantity > 0) {
      total += calculateItemTotal(newSale.itemId, newSale.quantity, method, hasVes);
    }
    
    return total;
  }

  const registerSale = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    
    let finalCart = newSale.cart.map(c => ({
      ...c,
      quantity: c.quantity === '' || c.quantity < 1 ? 1 : c.quantity,
      // recalcula totalUsd por si estaba erróneo
      totalUsd: calculateItemTotal(c.itemId, c.quantity === '' || c.quantity < 1 ? 1 : c.quantity, newSale.paymentMethod)
    }))

    if (newSale.itemId && newSale.quantity > 0) {
      const item = inventory.find(i => i.id === newSale.itemId)
      const totalUsd = calculateItemTotal(newSale.itemId, newSale.quantity, newSale.paymentMethod)
      finalCart.push({
        id: 'temp-' + Date.now(),
        itemId: newSale.itemId,
        itemName: item?.name || 'Prenda',
        quantity: parseInt(newSale.quantity),
        priceUsd: totalUsd / newSale.quantity,
        totalUsd
      })
    }

    if (finalCart.length === 0) {
      alert("Añade al menos un artículo o selecciona una prenda")
      return
    }
    const activeRate = getActiveRate();
    const totalUsd = finalCart.reduce((acc, i) => acc + i.totalUsd, 0)
    const totalVes = totalUsd * activeRate

    const needsQr = (newSale.paymentMethod === 'VES' || newSale.paymentMethod === 'BINANCE' || (newSale.paymentMethod === 'SHARED' && (Number(newSale.sharedVes) / activeRate) >= 1));
    if (needsQr && !showQrModal) {
      openModal('qr', newSale.paymentMethod === 'BINANCE' ? 'binance' : 'ves')
      return
    }

    const currentMoneyPaid = newSale.paymentMethod === 'SHARED' 
      ? (Number(newSale.sharedUsd || 0) + (Number(newSale.sharedVes || 0) / activeRate) + Number(newSale.sharedBinance || 0))
      : (newSale.paymentMethod === 'BINANCE' ? totalUsd : (newSale.status === 'pending' ? (Number(newSale.downPayment || 0)) : totalUsd));

    const isFullyPaid = currentMoneyPaid >= (totalUsd - 0.05);

    const newSaleData = {
      id: resumingSaleId || Date.now().toString(),
      items: finalCart,
      itemName: finalCart.length === 1 ? finalCart[0].itemName : `${finalCart.length} artículos`,
      customerName: newSale.customerName || 'Cliente General',
      customerID: newSale.customerID ? `${newSale.customerIDPrefix}-${newSale.customerID}` : '',
      customerPhone: newSale.customerPhone || '',
      customerEmail: newSale.customerEmail || '',
      totalUsd,
      totalVes,
      rate: activeRate,
      rateType: newSale.rateType,
      paymentMethod: newSale.paymentMethod,
      sharedUsd: newSale.paymentMethod === 'SHARED' ? Number(newSale.sharedUsd) : (newSale.paymentMethod === 'USD' ? totalUsd : 0),
      sharedVes: newSale.paymentMethod === 'SHARED' ? Number(newSale.sharedVes) : (newSale.paymentMethod === 'VES' ? totalVes : 0),
      sharedBinance: newSale.paymentMethod === 'BINANCE' ? totalUsd : (newSale.paymentMethod === 'SHARED' ? Number(newSale.sharedBinance) : 0),
      status: isFullyPaid ? 'paid' : 'pending',
      installments: Number(newSale.installments),
      paidInstallments: isFullyPaid ? Number(newSale.installments) : (newSale.status === 'pending' ? 1 : 0),
      downPayment: currentMoneyPaid,
      date: new Date().toISOString(),
      sellerName: user?.displayName || user?.email?.split('@')[0] || 'Vendedor'
    }

    try {
      await setDoc(doc(db, 'sales', newSaleData.id), newSaleData)

      // Solo descontamos del inventario si es una venta completamente nueva.
      // Si estamos retomando una pendiente, el stock ya se descontó antes.
      if (!resumingSaleId) {
        for (const cartItem of finalCart) {
          const item = inventory.find(i => i.id === cartItem.itemId)
          if (item) {
            await setDoc(doc(db, 'inventory', item.id), {
              quantity: item.quantity - cartItem.quantity
            }, { merge: true })
          }
        }
      }

      openModal('receipt', newSaleData)
      setShowQrModal(false)
      setResumingSaleId(null) // Resetear el estado de retomar
      setNewSale({ 
        itemId: '', quantity: 1, paymentMethod: 'USD', status: 'paid', customerName: '', 
        installments: 2, downPayment: '', paidInstallments: 0, installmentsToPay: 0,
        sharedUsd: '', sharedVes: '', sharedVesUsd: '', sharedBinance: '',
        customerID: '', customerIDPrefix: 'V', customerPhone: '', customerEmail: '',
        isManualQuantity: false, rateType: 'bcv', cart: []
      })
    } catch (err) {
      console.error("Sale Error:", err)
    }
  }

  const resumePendingSale = (sale) => {
    // 1. Recuperar items: nuevos (items) o legacy (itemId)
    let recoveredItems = []
    if (sale.items && sale.items.length > 0) {
      recoveredItems = sale.items
    } else if (sale.itemId) {
      recoveredItems = [{
        id: 'legacy-' + Date.now(),
        itemId: sale.itemId,
        itemName: sale.itemName,
        quantity: sale.quantity,
        priceUsd: sale.totalUsd / (sale.quantity || 1),
        totalUsd: sale.totalUsd
      }]
    }

    if (recoveredItems.length === 0) {
      alert("No se pudieron recuperar los artículos de esta venta.")
      return
    }

    setNewSale({
      itemId: '', 
      quantity: 1,
      paymentMethod: sale.paymentMethod,
      status: 'paid',
      customerName: sale.customerName,
      customerIDPrefix: sale.customerID?.includes('-') ? sale.customerID.split('-')[0] : 'V',
      customerID: sale.customerID?.includes('-') ? sale.customerID.split('-')[1] : (sale.customerID || ''),
      customerPhone: sale.customerPhone || '',
      customerEmail: sale.customerEmail || '',
      installments: 2,
      downPayment: sale.downPayment || 0,
      paidInstallments: sale.paidInstallments || 0,
      installmentsToPay: 1,
      sharedUsd: sale.sharedUsd || '',
      sharedVes: sale.sharedVes || '',
      sharedBinance: sale.sharedBinance || '',
      rateType: sale.rateType || 'bcv',
      cart: recoveredItems
    })
    setResumingSaleId(sale.id)
    handleTabChange('sales')
  }

  const handlePrint = () => {
    // delay to ensure rendering in some browsers before print
    setTimeout(() => {
      window.print()
    }, 300)
  }

  const handleWhatsAppShare = (sale) => {
    let breakdown = ''
    if (sale.paymentMethod === 'SHARED') {
      breakdown = `%0A*Metodo:* Compartido`
      if (Number(sale.sharedUsd) > 0) breakdown += `%0A  - Efectivo: ${formatCurrency(sale.sharedUsd)}`
      if (Number(sale.sharedBinance) > 0) breakdown += `%0A  - Binance: ${formatCurrency(sale.sharedBinance)}`
      if (Number(sale.sharedVes) > 0) breakdown += `%0A  - Bs: ${formatCurrency(sale.sharedVes, 'VES')}`
    } else {
      breakdown = `%0A*Metodo:* ${sale.paymentMethod}`
    }

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
*Tasa:* ${formatCurrency(sale.rate, 'VES')} (${sale.rateType?.toUpperCase() || 'BCV'})${breakdown}%0A
----------------------------------%0A
¡Gracias por tu compra! 🛍️%0A
*Atendido por:* ${sale.sellerName || 'Vendedor'}`
    
    window.open(`https://wa.me/${sale.customerPhone.replace(/\D/g, '')}?text=${text}`, '_blank')
  }

  const deleteInventory = async (id) => {
    if (window.confirm("¿Seguro que desea eliminar este item?")) {
      try {
        const { deleteDoc } = await import('firebase/firestore')
        await deleteDoc(doc(db, 'inventory', id))
      } catch (err) { console.error(err) }
    }
  }

  const updateInventory = async () => {
    if (!editingItemId) return;
    try {
      const { updateDoc } = await import('firebase/firestore')
      await updateDoc(doc(db, 'inventory', editingItemId), {
        name: editItemData.name,
        quantity: parseInt(editItemData.quantity),
        priceUsd: parseFloat(editItemData.priceUsd)
      });
      setEditingItemId(null);
    } catch (err) { 
      console.error(err);
      alert("Error al actualizar el item");
    }
  }

  const deleteSale = async (id) => {
    if (window.confirm("¿Seguro que desea eliminar este registro de venta?")) {
      try {
        const sale = sales.find(s => String(s.id) === String(id))
        const { deleteDoc } = await import('firebase/firestore')
        
        // Devolver stock si así se desea
        if (sale && window.confirm("¿Desea devolver los artículos al inventario?")) {
          const item = inventory.find(i => i.name === sale.itemName)
          if (item) {
             await setDoc(doc(db, 'inventory', item.id), {
               quantity: item.quantity + sale.quantity
             }, { merge: true })
          }
        }
        
        await deleteDoc(doc(db, 'sales', id))
      } catch (err) { console.error(err); }
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
      ? `$${parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `${parseFloat(val).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const copyPaymentData = () => {
    const data = "Datos de PagomóvilBDV:\nCédula: V21346892\nTeléfono: 04129734013\nBanco: 0102 - BDV"
    navigator.clipboard.writeText(data)
    setToast({ message: "Datos copiados al portapapeles", type: "success" })
    setTimeout(() => setToast(null), 3000)
  }

  const sharePaymentData = () => {
    const text = `Datos de PagomóvilBDV:%0A%0ACédula: V21346892%0ATeléfono: 04129734013%0ABanco: 0102 - Banco de Venezuela%0A%0ASi tienes BDVapp haz click aquí -> https://bdvdigital.banvenez.com/pagomovil?id=V21346892&phone=584129734013&bank=0102&description=9dxBliWt4XnVSB0LTqNasQ%3D%3D`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  const stats = {
    totalItems: (inventory || []).reduce((acc, i) => acc + (Number(i.quantity) || 0), 0),
    inventoryValue: (inventory || []).reduce((acc, i) => acc + ((Number(i.quantity) || 0) * (Number(i.priceUsd) || 0)), 0),
    totalSales: (sales || []).reduce((acc, s) => acc + (s.status === 'paid' ? (Number(s.totalUsd) || 0) : (Number(s.downPayment) || 0)), 0),
    pendingSales: (sales || []).filter(s => s && s.status === 'pending').reduce((acc, s) => acc + ((Number(s.totalUsd) || 0) - (Number(s.downPayment) || 0)), 0),
    totalExpenses: (expenses || []).reduce((acc, e) => acc + (Number(e.amountUsd) || 0), 0),
    pendingSalesCount: (sales || []).filter(s => s && s.status === 'pending').length,
    notesCount: (notes || []).length,
    promosCount: (promotions || []).length
  }
  stats.profitability = stats.totalSales - stats.totalExpenses;

  const handleGoogleLogin = async () => {
    try {
      setError('')
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      console.error(err)
      setError('Error al iniciar sesión con Google')
    }
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      console.error(err)
      setError(authMode === 'login' ? 'Correo o contraseña incorrectos' : 'Error al crear la cuenta. Verifica los datos.')
    }
  }

  const handleLogout = async () => {
    if (user) {
      try {
        const sellerRef = doc(db, 'active_sellers', user.uid);
        await updateDoc(sellerRef, { 
          status: 'offline', 
          lastActive: serverTimestamp() 
        });
      } catch (e) {
        console.error("Error setting offline status:", e);
      }
    }
    signOut(auth);
  };

  if (loading) return <div className="loading-screen">Cargando Sistema...</div>

  if (!user) {
    return (
      <div className="login-container">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="premium-card login-card"
        >
          <img src="/logo.jpg" alt="Logo" className="login-logo" />
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Outlet Caricuao</h2>
          <p className="login-subtitle">Gestión de Inventario y Ventas</p>

          <button onClick={handleGoogleLogin} className="google-login-btn">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            Acceso con Gmail
          </button>

          <div className="auth-divider">
            <span>o usa tu correo</span>
          </div>

          <form onSubmit={handleEmailAuth} className="login-form">
            <div className="input-group">
              <label><Mail size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Correo Electrónico</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="ejemplo@correo.com"
                required 
              />
            </div>
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label><Lock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Contraseña</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                required 
              />
            </div>
            
            {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="error-message">{error}</motion.p>}

            <button type="submit" className="btn btn-primary login-btn">
              {authMode === 'login' ? <><LogIn size={20} /> Entrar al Sistema</> : <><User size={20} /> Crear mi Cuenta</>}
            </button>
          </form>

          <button 
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'register' : 'login')
              setError('')
            }}
            className="toggle-auth-btn"
          >
            {authMode === 'login' ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </motion.div>
      </div>
    )
  }
  return (
    <div className="app-container">
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <motion.div 
          initial={{ x: -20, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }}
          className="header-left"
          style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}
        >
          <div 
            onClick={() => window.location.reload()} 
            style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer' }}
            title="Actualizar Aplicación"
          >
            <motion.img 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              src="/logo.jpg" 
              alt="Outlet Caricuao" 
              style={{ width: '80px', height: '80px', borderRadius: '50%', boxShadow: '0 5px 15px rgba(142, 108, 69, 0.2)' }} 
            />
            <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(to right, var(--primary-glow), var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.2rem' }}>
              Outlet Caricuao
            </h1>
          </div>
            <div className="team-presence" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '3px solid var(--primary-glow)', paddingLeft: '1rem' }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Equipo en Sesión
                {activeSellers.length > 1 && <span style={{ background: 'var(--success)', color: 'white', padding: '1px 6px', borderRadius: '10px', fontSize: '0.6rem' }}>{activeSellers.length}</span>}
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {activeSellers.map((seller) => {
                  const lastTs = seller.lastActive?.toDate ? seller.lastActive.toDate().getTime() : seller.lastActive
                  const isOnline = lastTs && (Date.now() - lastTs) < 60000 // 1 min para el punto verde
                  
                  
                  return (
                    <motion.div 
                      layout
                      key={seller.id} 
                      style={{ 
                        fontSize: '0.9rem', 
                        color: 'var(--primary-glow)', 
                        fontWeight: '700', 
                        margin: 0, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px',
                        background: 'rgba(142, 108, 69, 0.08)',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        width: 'fit-content',
                        border: seller.id === user.uid ? '1px solid rgba(142, 108, 69, 0.2)' : '1px solid transparent',
                        opacity: isOnline ? 1 : 0.6
                      }}
                    >
                      <div style={{ position: 'relative', display: 'flex' }}>
                        {seller.photo ? (
                          <img src={seller.photo} alt={seller.name} style={{ width: '24px', height: '24px', borderRadius: '50%', border: isOnline ? '1.5px solid var(--primary)' : '1.5px solid #666' }} />
                        ) : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isOnline ? 'var(--primary)' : '#555', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>
                            {seller.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span style={{ 
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: isOnline ? '#4CAF50' : '#888', 
                          border: '2px solid var(--card-bg)',
                          boxShadow: isOnline ? '0 0 5px #4CAF50' : 'none',
                          animation: isOnline ? 'pulse 2s infinite' : 'none' 
                        }}></span>
                      </div>
                      <span>{seller.name} {seller.id === user.uid ? '(Tú)' : ''}</span>
                    </motion.div>
                  )
                })}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => openModal('ig')}
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

          <div style={{ marginLeft: '1rem', borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user.photoURL && <img src={user.photoURL} alt="User" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--primary)' }} />}
            <button onClick={handleLogout} className="logout-btn" title="Cerrar Sesión">
              <LogOut size={18} />
              <span className="desktop-only">Salir</span>
            </button>
          </div>
        </motion.div>

        
        <div className="rates-header" style={{ display: 'flex', gap: '0.75rem' }}>
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="premium-card" style={{ padding: '0.75rem 1.25rem', borderBottom: '2px solid var(--success)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasa BCV</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--success)' }}>{parseFloat(rateBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </motion.div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="premium-card" style={{ padding: '0.75rem 1.25rem', borderBottom: '2px solid var(--primary)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasa Euro</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)' }}>{parseFloat(rateEuro).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </motion.div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="premium-card" style={{ padding: '0.75rem 1.25rem', borderBottom: '2px solid var(--accent)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasa Binance</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent)' }}>{parseFloat(rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </motion.div>
        </div>
      </header>

      <nav className="nav-container">
        <div className="tabs desktop-tabs">
          <div className={`tab ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => handleTabChange('inventory')}>Inventario</div>
          <div className={`tab ${activeTab === 'promos' ? 'active' : ''}`} onClick={() => handleTabChange('promos')}>Promociones</div>
          <div className={`tab ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => handleTabChange('sales')}>Vender</div>
          <div className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => handleTabChange('history')}>Historial</div>
          <div className={`tab ${activeTab === 'installments' ? 'active' : ''}`} onClick={() => handleTabChange('installments')}>Por cobrar</div>
          <div className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => handleTabChange('stats')}>Estadísticas</div>
          <div className={`tab ${activeTab === 'calc' ? 'active' : ''}`} onClick={() => handleTabChange('calc')}>Calculadora</div>
          <div className={`tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => handleTabChange('notes')}>Pendientes</div>
          <div className={`tab ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => handleTabChange('expenses')}>Gastos</div>
        </div>
        <div className="mobile-tabs">
          <select 
            value={activeTab} 
            onChange={(e) => handleTabChange(e.target.value)} 
            className="tab-select"
          >
            <option value="inventory">Inventario</option>
            <option value="promos">Promociones</option>
            <option value="sales">Vender</option>
            <option value="history">Historial</option>
            <option value="installments">Por cobrar</option>
            <option value="stats">Estadísticas</option>
            <option value="calc">Calculadora</option>
            <option value="notes">Notas Pendientes</option>
            <option value="expenses">Gastos</option>
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
                          step="0.01"
                          value={newItem.priceUsd} 
                          onChange={e => setNewItem({...newItem, priceUsd: e.target.value})}
                          placeholder="0.00"
                          min="0.01"
                          required
                        />
                        {newItem.priceUsd && rateBcv > 0 && (
                          <div className="currency-preview">
                            <span>Estimado (Oficial)</span>
                            <span>{formatCurrency(newItem.priceUsd * rateBcv, 'VES')}</span>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Stock Actual</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>VER EN:</label>
                      <select 
                        value={inventoryRateType} 
                        onChange={(e) => setInventoryRateType(e.target.value)}
                        style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 0.8rem', fontSize: '0.85rem', height: '36px' }}
                      >
                        <option value="bcv">BCV</option>
                        <option value="euro">EURO</option>
                        <option value="binance">BINANCE</option>
                      </select>
                    </div>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>N Prenda</th>
                          <th>Cant.</th>
                          <th>Precio USD</th>
                          <th>Precio VES</th>
                          <th>Registrado por</th>
                          <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.length === 0 ? (
                          <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sin items registrados</td></tr>
                        ) : (
                          inventory.map((item, index) => (
                             <tr key={item.id}>
                               {editingItemId === item.id ? (
                                 <>
                                   <td>
                                     <input 
                                       type="text" 
                                       value={editItemData.name} 
                                       onChange={e => setEditItemData({...editItemData, name: e.target.value})}
                                       style={{ padding: '5px', borderRadius: '4px', border: '1px solid var(--primary)' }}
                                     />
                                   </td>
                                   <td>
                                     <input 
                                       type="number" 
                                       value={editItemData.quantity} 
                                       onChange={e => setEditItemData({...editItemData, quantity: e.target.value})}
                                       style={{ width: '70px', padding: '5px', borderRadius: '4px', border: '1px solid var(--primary)' }}
                                     />
                                   </td>
                                   <td>
                                     <input 
                                       type="number" 
                                       step="0.01"
                                       value={editItemData.priceUsd} 
                                       onChange={e => setEditItemData({...editItemData, priceUsd: e.target.value})}
                                       style={{ width: '80px', padding: '5px', borderRadius: '4px', border: '1px solid var(--primary)' }}
                                     />
                                   </td>
                                   <td>
                                     {formatCurrency(editItemData.priceUsd * (inventoryRateType === 'bcv' ? rateBcv : (inventoryRateType === 'euro' ? rateEuro : rate)), 'VES')}
                                   </td>
                                   <td>-</td>
                                   <td style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                     <button onClick={updateInventory} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                                       <Check size={18} />
                                     </button>
                                     <button onClick={() => setEditingItemId(null)} style={{ background: '#95a5a6', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                                       <X size={18} />
                                     </button>
                                   </td>
                                 </>
                               ) : (
                                 <>
                                   <td style={{ fontWeight: '500' }}>
                                     <span style={{ marginRight: '8px', color: 'var(--accent)', fontWeight: 'bold' }}>{index + 1}</span>
                                     {item.name}
                                   </td>
                                   <td><span className={`badge ${item.quantity < 5 ? 'badge-danger' : 'badge-success'}`}>{item.quantity}</span></td>
                                   <td>{formatCurrency(item.priceUsd)}</td>
                                   <td style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>
                                     {formatCurrency(item.priceUsd * (inventoryRateType === 'bcv' ? rateBcv : (inventoryRateType === 'euro' ? rateEuro : rate)), 'VES')}
                                   </td>
                                   <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.author || '-'}</td>
                                   <td style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                     <button 
                                       onClick={() => {
                                         setEditingItemId(item.id);
                                         setEditItemData({ name: item.name, quantity: item.quantity, priceUsd: item.priceUsd });
                                       }}
                                       style={{ background: 'rgba(142, 108, 69, 0.1)', border: 'none', color: 'var(--primary-glow)', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
                                     >
                                       <Pencil size={18} />
                                     </button>
                                     <button 
                                       onClick={() => deleteInventory(item.id)}
                                       className="btn-trash"
                                       title="Eliminar item"
                                       style={{ background: 'rgba(255, 77, 77, 0.15)', border: '1px solid rgba(255, 77, 77, 0.2)', color: '#ff4d4d', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
                                     >
                                       <Trash2 size={18} />
                                     </button>
                                   </td>
                                 </>
                               )}
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
                  <form onSubmit={async (e) => {
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
                      itemId: selectedItemId,
                      itemName: selectedItem.name,
                      minQuantity: minQty,
                      promoPrice: totalPrice / minQty,
                      totalPrice: totalPrice,
                      author: user?.displayName || user?.email?.split('@')[0] || 'Vendedor'
                    };
                    
                    try {
                      const promoId = Date.now().toString()
                      await setDoc(doc(db, 'promotions', promoId), newPromo)
                      e.target.reset();
                    } catch (err) { console.error(err) }
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
                          <th>Activada por</th>
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
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{promo.author || '-'}</td>
                              <td>
                                <button 
                                  onClick={async () => {
                                    const { deleteDoc } = await import('firebase/firestore')
                                    await deleteDoc(doc(db, 'promotions', promo.id))
                                  }}
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
                          handleTabChange('installments')
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
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.8rem', paddingRight: '46px' }}>
                        <label style={{ flex: 3, margin: 0, fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          PRENDAS A VENDER
                        </label>
                        <label style={{ flex: 1, margin: 0, fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          CANTIDAD
                        </label>
                      </div>
                      {newSale.cart.map((cartItem, i) => (
                        <div key={cartItem.id} className="animate-fade-in" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div className="input-group" style={{ flex: 3, marginBottom: 0 }}>
                            <select 
                              value={cartItem.itemId} 
                              onChange={e => {
                                const val = e.target.value;
                                if (!val) {
                                   removeFromCart(cartItem.id);
                                   return;
                                }
                                const target = inventory.find(inv => inv.id === val);
                                const totalUsd = calculateItemTotal(val, cartItem.quantity, newSale.paymentMethod);
                                setNewSale(prev => ({
                                  ...prev,
                                  cart: prev.cart.map(c => c.id === cartItem.id ? {
                                     ...c, itemId: val, itemName: target.name, totalUsd, priceUsd: totalUsd/cartItem.quantity
                                  } : c)
                                }))
                              }}
                            >
                              <option value="">Quitar prenda...</option>
                              {inventory.map((item, idx) => item.quantity > 0 ? (
                                <option key={item.id} value={item.id}>
                                   {item.name} - {formatCurrency(item.priceUsd)}
                                </option>
                              ) : null)}
                            </select>
                          </div>
                          
                          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                            <input 
                              type="number" 
                              value={cartItem.quantity} 
                              onChange={e => {
                                const raw = e.target.value;
                                const invMatch = inventory.find(inv => inv.id === cartItem.itemId);
                                const maxQty = invMatch ? invMatch.quantity : 1;
                                
                                let qty = raw === '' ? '' : parseInt(raw);
                                if (qty !== '') {
                                  if (qty <= 0) qty = 1;
                                  if (qty > maxQty) qty = maxQty;
                                }

                                const totalUsd = calculateItemTotal(cartItem.itemId, qty || 0, newSale.paymentMethod);
                                setNewSale(prev => ({
                                  ...prev,
                                  cart: prev.cart.map(c => c.id === cartItem.id ? { ...c, quantity: qty, totalUsd, priceUsd: qty ? totalUsd/qty : 0 } : c)
                                }))
                              }} 
                              min="1"
                              max={inventory.find(inv => inv.id === cartItem.itemId)?.quantity || 1} 
                            />
                          </div>
                          
                          <button 
                            type="button" 
                            title="Remover"
                            onClick={() => removeFromCart(cartItem.id)}
                            style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '0.8rem 0.5rem', marginTop: '2px' }}
                          >
                            <X size={20} />
                          </button>
                        </div>
                      ))}

                      {inventory.filter(i => i.quantity > 0 && !newSale.cart.some(c => c.itemId === i.id)).length > 0 && (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <div className="input-group" style={{ flex: 3, marginBottom: 0 }}>
                            <select 
                              value={newSale.itemId} 
                              onChange={e => {
                                const newItemId = e.target.value;
                                if (!newItemId) return;
                                
                                const target = inventory.find(i => i.id === newItemId);
                                if (!target) return;
                                
                                const totalUsd = calculateItemTotal(newItemId, 1, newSale.paymentMethod);
                                const cartItem = {
                                  id: Date.now() + Math.random().toString(),
                                  itemId: newItemId,
                                  itemName: target.name,
                                  quantity: 1,
                                  priceUsd: totalUsd,
                                  totalUsd
                                };
                                
                                setNewSale(prev => ({
                                  ...prev,
                                  cart: [...prev.cart, cartItem],
                                  itemId: '', 
                                  quantity: 1
                                }));
                              }}
                              style={{ border: '1px dashed var(--accent)', background: 'rgba(255,255,255,0.5)' }}
                            >
                              <option value="">{newSale.cart.length === 0 ? "Seleccione una prenda..." : "+ Añadir otra prenda..."}</option>
                              {inventory.map((item, idx) => {
                                const alreadyInCart = newSale.cart.some(c => c.itemId === item.id);
                                return item.quantity > 0 && !alreadyInCart ? (
                                  <option key={item.id} value={item.id}>
                                     {item.name} - {formatCurrency(item.priceUsd)}
                                  </option>
                                ) : null;
                              })}
                            </select>
                          </div>
                          <div className="input-group" style={{ flex: 1, marginBottom: 0, opacity: 0.5, pointerEvents: 'none' }}>
                             <input type="number" value="1" readOnly style={{ background: '#f5f5f5' }} />
                          </div>
                          <div style={{ padding: '0.8rem 0.5rem', width: '36px' }}></div>
                        </div>
                      )}
                    </div>

                    <div className="input-group">
                      <label>Información de Promociones</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                        {promotions.length === 0 ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No hay promociones configuradas</div>
                        ) : (
                          promotions.map(promo => {
                            const isSelected = newSale.cart.some(c => c.itemId === promo.itemId);
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
                          <option value="VES">Bolívares</option>
                          <option value="BINANCE">Binance (USDT)</option>
                          <option value="SHARED">Pago Compartido ($ + Bolívares)</option>
                        </select>
                      </div>

                      <div className="input-group">
                        <label>Estado</label>
                        <select 
                          value={newSale.status} 
                          onChange={e => setNewSale({...newSale, status: e.target.value})}
                        >
                          <option value="paid">Pagado Total</option>
                          {newSale.paymentMethod !== 'SHARED' && !resumingSaleId && <option value="pending">Aparte (Pendiente)</option>}
                        </select>
                      </div>
                    </div>

                    {newSale.paymentMethod === 'BINANCE' && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="premium-card" style={{ background: '#12161c', marginBottom: '1.5rem', border: '1px solid #f3ba2f', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                           <img src="https://upload.wikimedia.org/wikipedia/commons/e/e8/Binance_Logo.svg" alt="Binance" style={{ width: '120px' }} />
                        </div>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem' }}>
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent('Maria Diaz0124')}`} 
                            alt="Binance QR" 
                            style={{ width: '180px', height: '180px' }}
                          />
                        </div>
                        <p style={{ color: '#f3ba2f', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Maria Diaz0124</p>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Muestra este QR al cliente para recibir el pago USDT</p>
                      </motion.div>
                    )}

                    {newSale.paymentMethod === 'VES' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="premium-card" style={{ background: '#f8f8f8', marginBottom: '1.5rem', border: '1px solid #eb1c24', textAlign: 'center', color: '#333' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', gap: '1rem', alignItems: 'center' }}>
                           <img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_Banco_de_Venezuela.svg" alt="BDV" style={{ width: '100px' }} />
                           <h4 style={{ margin: 0, color: '#eb1c24' }}>Pago Móvil</h4>
                        </div>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent('Pago Movil BDV: 04129734013 CI: 21346892 Banco: 0102')}`} 
                            alt="Pago Movil QR" 
                            style={{ width: '180px', height: '180px' }}
                          />
                        </div>
                        <div style={{ textAlign: 'left', background: 'white', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                          <div style={{ marginBottom: '0.3rem' }}><strong>CI:</strong> V21346892</div>
                          <div style={{ marginBottom: '0.3rem' }}><strong>Tel:</strong> 04129734013</div>
                          <div><strong>Banco:</strong> 0102 - BDV</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="button" onClick={copyPaymentData} className="btn" style={{ flex: 1, background: '#eb1c24', color: 'white', fontSize: '0.8rem' }}>
                            <Copy size={14} /> Copiar
                          </button>
                          <button type="button" onClick={sharePaymentData} className="btn" style={{ flex: 1, background: '#25D366', color: 'white', fontSize: '0.8rem' }}>
                            <Share2 size={14} /> Compartir
                          </button>
                        </div>
                        <a 
                          href="https://bdvdigital.banvenez.com/pagomovil?id=V21346892&phone=584129734013&bank=0102&description=9dxBliWt4XnVSB0LTqNasQ%3D%3D" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ display: 'block', marginTop: '1rem', fontSize: '0.75rem', color: '#eb1c24', fontWeight: 'bold', textDecoration: 'none' }}
                        >
                          Si tienes BDVapp haz click aquí
                        </a>
                      </motion.div>
                    )}

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
                                     const targetTotal = getGrandTotal();
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
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
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
                                      placeholder="En Bolívares"
                                      onChange={e => {
                                        const val = e.target.value;
                                        if (val === '') {
                                          setNewSale({...newSale, sharedVes: '', sharedVesUsd: ''});
                                        } else {
                                          const activeRate = getActiveRate();
                                          setNewSale({
                                            ...newSale, 
                                            sharedVes: val, 
                                            sharedVesUsd: (parseFloat(val) / activeRate).toFixed(2)
                                          });
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                   <button type="button" onClick={() => openModal('qr', 'ves')} className="btn" style={{ flex: 1, background: '#eb1c24', color: 'white', fontSize: '0.75rem', height: '36px' }}>
                                      <QrCode size={14} /> QR Pago Móvil
                                   </button>
                                   <button type="button" onClick={copyPaymentData} className="btn" style={{ flex: 1, background: '#eb1c24', color: 'white', fontSize: '0.75rem', height: '36px' }}>
                                      <Copy size={14} /> Copiar Datos
                                   </button>
                                </div>
                              </div>
                              {Number(newSale.sharedVes) > 0 && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '0.5rem', fontWeight: '600' }}>
                                  Monto a cobrar: {formatCurrency(newSale.sharedVes, 'VES')}
                                </div>
                              )}
                            </div>
                          </div>

                           <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                               <label style={{ color: '#f3ba2f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 <img src="https://upload.wikimedia.org/wikipedia/commons/e/e8/Binance_Logo.svg" alt="Binance" style={{ width: '14px' }} />
                                 Binance USDT
                               </label>
                               <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <div style={{ position: 'relative', flex: 1 }}>
                                   <input 
                                     type="number" 
                                     step="0.01" 
                                     value={newSale.sharedBinance}
                                     placeholder="0.00"
                                     onChange={e => setNewSale({...newSale, sharedBinance: e.target.value})}
                                   />
                                   <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#f3ba2f', fontSize: '0.7rem', fontWeight: 'bold' }}>USDT</div>
                                 </div>
                                 <button type="button" onClick={() => openModal('qr', 'binance')} className="btn-icon" style={{ background: '#f3ba2f', color: '#12161c', border: 'none' }} title="Ver QR Binance">
                                   <QrCode size={18} />
                                 </button>
                               </div>
                               {Number(newSale.sharedBinance) > 0 && (
                                 <div style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.4)', marginTop: '0.4rem', fontStyle: 'italic' }}>
                                   Muestra el QR de Binance al cliente si es necesario
                                 </div>
                               )}
                             </div>
                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: '1rem', paddingTop: '0.8rem' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                             <span style={{ color: 'var(--text-muted)' }}>Monto en Efectivo:</span>
                             <span style={{ fontWeight: '600' }}>{formatCurrency(Number(newSale.sharedUsd || 0))}</span>
                           </div>
                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                             <span style={{ color: 'var(--text-muted)' }}>Monto en Binance ($):</span>
                             <span style={{ fontWeight: '600', color: '#f3ba2f' }}>{formatCurrency(Number(newSale.sharedBinance || 0))}</span>
                           </div>
                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                             <span style={{ color: 'var(--text-muted)' }}>Monto en Bolívares ($):</span>
                             <span style={{ fontWeight: '600' }}>{formatCurrency(Number(newSale.sharedVes || 0) / getActiveRate())}</span>
                           </div>
                           
                           {(() => {
                             const activeRate = getActiveRate();
                             const historicalAbono = resumingSaleId ? (sales.find(s => String(s.id) === String(resumingSaleId))?.downPayment || 0) : 0;
                             const currentInputs = (Number(newSale.sharedUsd || 0) + (Number(newSale.sharedVes || 0) / activeRate) + Number(newSale.sharedBinance || 0));
                             const currentTotalToPay = getGrandTotal();
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
                        <label style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Pagar ahora (Cuota 2):</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <select 
                            value={newSale.installmentsToPay} 
                            onChange={e => setNewSale({...newSale, installmentsToPay: parseInt(e.target.value)})}
                            style={{ flex: 1 }}
                          >
                            {[...Array(Math.max(0, Number(newSale.installments || 0) - Number(newSale.paidInstallments || 0)))].map((_, i) => (
                              <option key={i+1} value={i+1}>2da Cuota (Final)</option>
                            ))}
                          </select>
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
                            {[2].map(n => (
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
                      <div className="premium-card" style={{ background: 'rgba(255,255,255,0.02)', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                        <div style={{ marginBottom: '1.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Tasa para Conversión</label>
                          <select 
                            value={newSale.rateType} 
                            onChange={e => setNewSale({...newSale, rateType: e.target.value})}
                            style={{ border: '2px solid var(--primary)', background: 'rgba(194, 168, 136, 0.08)', fontWeight: 'bold', fontSize: '1.1rem' }}
                          >
                            <option value="bcv">Tasa BCV ({parseFloat(rateBcv).toLocaleString('es-VE')})</option>
                            <option value="euro">Tasa Euro ({parseFloat(rateEuro).toLocaleString('es-VE')})</option>
                            <option value="binance">Tasa Binance ({parseFloat(rate).toLocaleString('es-VE')})</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span>Total a pagar:</span>
                            {((newSale.paymentMethod === 'VES') || (newSale.paymentMethod === 'BINANCE') || (newSale.paymentMethod === 'SHARED' && (Number(newSale.sharedVes) / getActiveRate()) >= 1)) && (
                               <div style={{ display: 'flex', gap: '0.5rem' }}>
                                 <button type="button" onClick={() => openModal('qr', newSale.paymentMethod === 'BINANCE' ? 'binance' : 'ves')} className="btn-icon" title="Ver QR">
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

                                if (newSale.paymentMethod === 'USD' || newSale.paymentMethod === 'SHARED' || newSale.paymentMethod === 'BINANCE') {
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
                                      {newSale.paymentMethod === 'USD' && (
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                          ≈ {formatCurrency(totalVes, 'VES')}
                                        </span>
                                      )}
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
                                       <span>Pago Registrado:</span>
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
                                 <span>{formatCurrency(Math.max(0, getGrandTotal() - totalPaidSoFar))}</span>
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


                        
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                          <div>Tasa {(newSale.rateType || 'bcv').toUpperCase()}: {parseFloat(getActiveRate()).toLocaleString('es-VE')}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--primary-glow)', marginTop: '2px' }}>
                            Calculado: {calculateItemTotal(newSale.itemId, newSale.quantity, 'USD').toFixed(2)} USD × {parseFloat(getActiveRate()).toLocaleString('es-VE')}
                          </div>
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
                        <th>Cliente</th>
                        <th>Prenda</th>
                        <th>Cant.</th>
                        <th>Total USD</th>
                        <th>Total VES / Pago</th>
                        <th>Vendedor</th>
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
                              via {sale.paymentMethod === 'SHARED' ? `$${sale.sharedUsd} + ${sale.sharedVes}` : sale.paymentMethod}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sale.sellerName || '-'}</td>
                          <td>
                            <span className={`badge ${sale.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                              {sale.status === 'paid' ? 'Pagado' : 'Pendiente'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => {
                                  openModal('receipt', sale)
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px' }}
                                title="Ver Recibo"
                              >
                                <QrCode size={18} />
                              </button>
                              <button 
                                onClick={() => {
                                  openModal('delivery', sale)
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
                  <CreditCard size={20} /> Cuentas por Cobrar
                </h3>
                <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                  {sales.filter(s => s.status === 'pending').length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No hay cobros pendientes
                    </div>
                  ) : (
                    sales.filter(s => s.status === 'pending').map((sale, index) => (
                      <div key={sale.id} className="premium-card" style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '4px solid var(--warning)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <div>
                            <h4 style={{ color: 'var(--accent)' }}>{index + 1}. {sale.customerName}</h4>
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
                            <span>Hoy:</span>
                            <span>{formatCurrency((sale.totalUsd - sale.downPayment) * rate, 'VES')}</span>
                          </div>
                          {sale.downPayment > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--success)' }}>
                              <span>Pagado hoy:</span>
                              <span>{formatCurrency(sale.downPayment)}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem' }}>
                            <span>Cuota final (1) de:</span>
                             <span>{formatCurrency(sale.totalUsd - sale.downPayment)}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                           <span>Registrado: {new Date(sale.date).toLocaleDateString()}</span>
                           <span style={{ fontWeight: '600' }}>Vendedor: {sale.sellerName || '-'}</span>
                         </div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '0.75rem' }}>
                          <button 
                            onClick={() => openModal('receipt', sale)}
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
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <DollarSign size={20} color="var(--success)" /> Rentabilidad: Ventas vs Gastos
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                  <motion.div whileHover={{ y: -5 }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Ventas (Ingresos)</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--success)' }}>
                      {formatCurrency(stats.totalSales)}
                    </p>
                  </motion.div>
                  <motion.div whileHover={{ y: -5 }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Gastos (Egresos)</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--danger)' }}>
                      {formatCurrency(stats.totalExpenses)}
                    </p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ y: -5 }}
                    style={{ background: 'rgba(142, 108, 69, 0.03)', padding: '1rem', borderRadius: '16px', border: '1px dashed var(--primary)' }}
                  >
                    <p style={{ color: 'var(--primary-glow)', fontSize: '0.85rem', fontWeight: 'bold' }}>Rentabilidad (Neto)</p>
                    <p style={{ fontSize: '2rem', fontWeight: '900', color: stats.profitability >= 0 ? 'var(--primary-glow)' : 'var(--danger)' }}>
                      {formatCurrency(stats.profitability)}
                    </p>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Margen de beneficio: {stats.totalSales > 0 ? Math.round((stats.profitability / stats.totalSales) * 100) : 0}%
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="premium-card" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Análisis de Mercado</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ticket Promedio por Venta</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>
                      {formatCurrency(sales.length > 0 ? (sales.reduce((acc, s) => acc + s.totalUsd, 0) / sales.length) : 0)}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Prenda más Vendida</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                      {sales.length > 0 ? Object.entries(sales.reduce((acc, s) => {
                        acc[s.itemName] = (acc[s.itemName] || 0) + (Number(s.quantity) || 0);
                        return acc;
                      }, {})).sort((a,b) => b[1] - a[1])[0][0] : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Efectividad de Cobro</p>
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

              {/* ── Toggle Switch ── */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'inline-flex',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '50px',
                  padding: '4px',
                  gap: '4px',
                  boxShadow: '0 4px 15px rgba(142,108,69,0.1)'
                }}>
                  <button onClick={() => setCalcMode('normal')} style={{
                    padding: '8px 20px',
                    borderRadius: '50px',
                    border: 'none',
                    background: calcMode === 'normal' ? 'var(--primary-glow)' : 'transparent',
                    color: calcMode === 'normal' ? 'white' : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <Calculator size={14} /> Calculadora
                  </button>
                  <button onClick={() => setCalcMode('financial')} style={{
                    padding: '8px 20px',
                    borderRadius: '50px',
                    border: 'none',
                    background: calcMode === 'financial' ? 'var(--primary-glow)' : 'transparent',
                    color: calcMode === 'financial' ? 'white' : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <DollarSign size={14} /> Convertidor
                  </button>
                </div>
              </div>

              {/* ── MODO CALCULADORA NORMAL ── */}
              {calcMode === 'normal' && (
                <div className="premium-card" style={{ width: '100%', padding: '1rem' }}>
                  {/* Display */}
                  <div style={{
                    background: 'linear-gradient(135deg, #2d1f10, #3d2815)',
                    borderRadius: '16px',
                    padding: '1rem 1.5rem',
                    marginBottom: '1rem',
                    minHeight: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', minHeight: '20px' }}>{calcHistory}</div>
                    <div style={{ fontSize: '2.8rem', fontWeight: '700', color: 'white', textAlign: 'right', wordBreak: 'break-all' }}>{calcVal}</div>
                  </div>

                  {/* Grid de botones — full width */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', width: '100%' }}>
                    <button onClick={clearCalc} style={btnStyle('clear')}>AC</button>
                    <button onClick={() => setCalcVal(calcVal.length > 1 ? calcVal.slice(0, -1) : '0')} style={btnStyle('op')}>⌫</button>
                    <button onClick={() => setCalcVal(String(parseFloat(calcVal || 0) / 100))} style={btnStyle('op')}>%</button>
                    <button onClick={() => handleCalcOp('/')} style={btnStyle('op')}>÷</button>

                    {[7,8,9].map(n => <button key={n} onClick={() => handleCalcInput(n)} style={btnStyle('num')}>{n}</button>)}
                    <button onClick={() => handleCalcOp('*')} style={btnStyle('op')}>×</button>

                    {[4,5,6].map(n => <button key={n} onClick={() => handleCalcInput(n)} style={btnStyle('num')}>{n}</button>)}
                    <button onClick={() => handleCalcOp('-')} style={btnStyle('op')}>−</button>

                    {[1,2,3].map(n => <button key={n} onClick={() => handleCalcInput(n)} style={btnStyle('num')}>{n}</button>)}
                    <button onClick={() => handleCalcOp('+')} style={btnStyle('op')}>+</button>

                    <button onClick={() => handleCalcInput(0)} style={{ ...btnStyle('num'), gridColumn: 'span 2' }}>0</button>
                    <button onClick={() => handleCalcInput('.')} style={btnStyle('num')}>.</button>
                    <button onClick={handleCalcEqual} style={btnStyle('eq')}>=</button>
                  </div>
                </div>
              )}

              {/* ── MODO CONVERTIDOR ── */}
              {calcMode === 'financial' && (
                <div>
                  {/* Header con botón actualizar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ingresa un monto para convertir</span>
                    <button
                      onClick={() => fetchRate()}
                      disabled={updatingRates}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 14px',
                        background: updatingRates ? '#ccc' : 'var(--primary-glow)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: updatingRates ? 'not-allowed' : 'pointer',
                        opacity: updatingRates ? 0.7 : 1,
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {updatingRates ? '⏳ Actualizando...' : '↻ Actualizar Tasas'}
                    </button>
                  </div>

                  {/* 3 Currency Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { label: 'Dólar Estadounidense', symbol: '$', color: '#22c55e', icon: '💵', currentRate: rateBcv, rateLabel: 'BCV', currency: 'USD' },
                      { label: 'Euro', symbol: '€', color: '#3b82f6', icon: '💶', currentRate: rateEuro, rateLabel: 'EURO', currency: 'EUR' },
                      { label: 'Tether (USDT)', symbol: '₮', color: '#f59e0b', icon: '🟡', currentRate: rate, rateLabel: 'BINANCE', currency: 'USDT' }
                    ].map(({ label, symbol, color, icon, currentRate, rateLabel, currency }) => {
                      const amt = parseFloat(calcVal) || 0;
                      const inVes = (amt * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      return (
                        <div key={currency} style={{
                          background: 'linear-gradient(135deg, #1a1108, #2d1f10)',
                          borderRadius: '20px',
                          padding: '1.25rem 1.5rem',
                          border: `1px solid ${color}22`,
                          boxShadow: `0 8px 25px ${color}15`
                        }}>
                          {/* Título */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                            <span style={{ color: 'white', fontWeight: '700', fontSize: '1rem' }}>{label}</span>
                          </div>
                          {/* Input USD/EUR/USDT */}
                          <div style={{ marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Monto en {currency}</div>
                            <div style={{
                              background: 'rgba(255,255,255,0.07)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '10px',
                              padding: '0.6rem 1rem',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                              <input
                                type="number"
                                value={calcVal === '0' ? '' : calcVal}
                                onChange={e => setCalcVal(e.target.value || '0')}
                                placeholder="0.00"
                                style={{
                                  background: 'transparent', border: 'none', outline: 'none',
                                  color: 'white', fontSize: '1.1rem', fontWeight: '600', width: '100%'
                                }}
                              />
                              <span style={{ color: color, fontWeight: '700', fontSize: '0.85rem' }}>{currency}</span>
                            </div>
                          </div>
                          {/* Resultado VES */}
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Monto en Bolívares</div>
                            <div style={{
                              background: 'rgba(255,255,255,0.07)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '10px',
                              padding: '0.6rem 1rem',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                              <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: '600' }}>{amt > 0 ? inVes : '0.00'}</span>
                              <span style={{ color: color, fontWeight: '700', fontSize: '0.85rem' }}>VES</span>
                            </div>
                          </div>
                          {/* Tasa */}
                          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                            <span>Tasa {rateLabel}</span>
                            <span style={{ color, fontWeight: '700' }}>{currentRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Botón limpiar */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
                    <button onClick={() => setCalcVal('0')} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '10px 28px',
                      background: 'rgba(165,42,42,0.12)',
                      color: 'var(--danger)',
                      border: '1px solid var(--danger)',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}>
                      <Trash2 size={15} /> Limpiar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid-layout">
                <div className="premium-card">
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Copy size={20} /> Nueva Nota Pendiente
                  </h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newNote.title || !newNote.text) return;
                    try {
                      const noteId = Date.now().toString()
                      await setDoc(doc(db, 'notes', noteId), {
                        ...newNote,
                        author: user?.displayName || user?.email?.split('@')[0] || 'Vendedor',
                        date: new Date().toISOString()
                      })
                      setNewNote({ title: '', text: '' });
                    } catch (err) { console.error(err) }
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
                    <ClipboardList size={20} /> Lista de Pendientes ({notes.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {notes.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay notas pendientes actuales.</p>
                    ) : (
                      notes.map((note, index) => (
                        <div key={note.id} style={{ padding: '1.25rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ margin: 0, color: 'var(--accent)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ background: 'var(--accent)', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>{index + 1}</span>
                              {note.title}
                            </h4>
                            <button 
                              onClick={async () => {
                                const { deleteDoc } = await import('firebase/firestore')
                                await deleteDoc(doc(db, 'notes', note.id))
                              }}
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

          {activeTab === 'expenses' && (
            <motion.div key="expenses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid-layout">
                <div className="premium-card">
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={20} /> Registrar Gasto
                  </h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newExpense.concept || !newExpense.amountUsd) return;
                    try {
                      const id = Date.now().toString()
                      await setDoc(doc(db, 'expenses', id), {
                        ...newExpense,
                        date: new Date().toISOString(),
                        author: user?.displayName || user?.email?.split('@')[0] || 'Vendedor'
                      })
                      setNewExpense({ concept: '', amountUsd: '' });
                    } catch (err) { console.error(err) }
                  }}>
                    <div className="input-group">
                      <label>Concepto del Gasto</label>
                      <input 
                        type="text" 
                        value={newExpense.concept} 
                        onChange={e => setNewExpense({...newExpense, concept: e.target.value})}
                        placeholder="Ej. Alquiler Local, Pago de Luz..."
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label>Monto (USD)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={newExpense.amountUsd} 
                        onChange={e => setNewExpense({...newExpense, amountUsd: e.target.value})}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                      Guardar Gasto
                    </button>
                  </form>
                </div>

                <div className="premium-card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Historial de Gastos</h3>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Concepto</th>
                          <th>Fecha</th>
                          <th>Monto USD</th>
                          <th>Monto VES</th>
                          <th>Registrado por</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.length === 0 ? (
                          <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay gastos registrados</td></tr>
                        ) : (
                          expenses.map(expense => (
                            <tr key={expense.id}>
                              <td style={{ fontWeight: '500' }}>{expense.concept}</td>
                              <td style={{ fontSize: '0.85rem' }}>{new Date(expense.date).toLocaleDateString()}</td>
                              <td style={{ fontWeight: 'bold' }}>{formatCurrency(expense.amountUsd)}</td>
                              <td style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>{formatCurrency(expense.amountUsd * rateBcv, 'VES')}</td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{expense.author || '-'}</td>
                              <td>
                                <button 
                                  onClick={async () => {
                                    const { deleteDoc } = await import('firebase/firestore')
                                    await deleteDoc(doc(db, 'expenses', expense.id))
                                  }}
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

        </AnimatePresence>
      </main>

      {activeTab !== 'sales' && (
        <div className="stats-grid" style={{ marginTop: '2rem' }}>
          <StatCard title="Rentabilidad" value={formatCurrency(stats.profitability)} icon={<BarChart3 size={20} />} color="var(--primary-glow)" />
          <StatCard title="Gastos" value={formatCurrency(stats.totalExpenses)} icon={<TrendingDown size={20} />} color="var(--danger)" />
          <StatCard title="Monto por Cobrar" value={formatCurrency(stats.pendingSales)} icon={<CreditCard size={20} />} color="var(--warning)" />
          <StatCard title="Ventas Totales" value={formatCurrency(stats.totalSales)} icon={<ShoppingCart size={20} />} color="var(--success)" />
          <StatCard title="Pendientes" value={stats.notesCount} icon={<ClipboardList size={20} />} color="#6366f1" />
          <StatCard title="Valor Inventario" value={formatCurrency(stats.inventoryValue)} icon={<DollarSign size={20} />} color="var(--primary)" />
          <StatCard title="Promociones Activas" value={stats.promosCount} icon={<Tag size={20} />} color="#ec4899" />
        </div>
      )}

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
                onClick={closeModal} 
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
              >
                <X size={24} />
              </button>
              <h3 style={{ color: '#8E6C45', marginBottom: '1rem' }}>
                {(qrSubtype === 'binance' || (!qrSubtype && newSale.paymentMethod === 'BINANCE')) ? 'Pago Binance (USDT)' : 'Pago Móvil Banco de Venezuela'}
              </h3>
              <div style={{ background: '#f8f8f8', padding: '1.5rem 1rem', borderRadius: '16px', marginBottom: '1rem' }}>
                {(qrSubtype === 'binance' || (!qrSubtype && newSale.paymentMethod === 'BINANCE')) ? (
                  <>
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/e/e8/Binance_Logo.svg" 
                      alt="Binance Logo" 
                      style={{ width: '120px', marginBottom: '1rem' }}
                    />
                    <div style={{ background: '#12161c', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'white' }}>
                       <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('Maria Diaz0124')}`} 
                        alt="Binance QR" 
                        style={{ width: '180px', height: '180px', border: '5px solid #f3ba2f', borderRadius: '8px' }}
                      />
                      <p style={{ fontWeight: '700', fontSize: '1.1rem', color: '#f3ba2f' }}>Maria Diaz0124</p>
                    </div>
                  </>
                ) : (
                  <>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('Pago Movil BDV: 04129734013 CI: 21346892 Banco: 0102')}`} 
                      alt="QR Pago Movil" 
                      style={{ width: '200px', height: '200px', marginBottom: '1rem', borderRadius: '8px' }}
                    />
                    <div style={{ textAlign: 'left', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #eee' }}>
                        <span><strong>Tel:</strong> 04129734013</span>
                        <button onClick={() => { navigator.clipboard.writeText('04129734013'); setToast({message:'Teléfono copiado', type:'success'}); setTimeout(()=>setToast(null), 2000); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Copy size={14}/></button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #eee' }}>
                        <span><strong>CI:</strong> V21346892</span>
                        <button onClick={() => { navigator.clipboard.writeText('21346892'); setToast({message:'Cédula copiada', type:'success'}); setTimeout(()=>setToast(null), 2000); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Copy size={14}/></button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #eee' }}>
                        <span><strong>Banco:</strong> 0102 - BDV</span>
                        <button onClick={() => { navigator.clipboard.writeText('0102'); setToast({message:'Código banco copiado', type:'success'}); setTimeout(()=>setToast(null), 2000); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Copy size={14}/></button>
                      </div>
                    </div>
                  </>
                )}
                
                <hr style={{ margin: '1rem 0', opacity: 0.1 }} />
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', color: 'var(--primary-glow)', background: 'rgba(142,108,69,0.05)', padding: '1rem', borderRadius: '12px' }}>
                  Total Cobrar: {newSale.paymentMethod === 'BINANCE' ? formatCurrency(getGrandTotal()) : formatCurrency(newSale.paymentMethod === 'SHARED' ? newSale.sharedVes : getGrandTotal() * getActiveRate(), 'VES')}
                  {newSale.paymentMethod !== 'BINANCE' && (
                    <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '4px', fontWeight: '500' }}>
                      Tasa Aplicada: {(newSale.rateType || 'BCV').toUpperCase()} ({formatCurrency(getActiveRate(), 'VES')})
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {newSale.paymentMethod === 'VES' && (
                  <a 
                    href="https://bdvdigital.banvenez.com/pagomovil?id=V21346892&phone=584129734013&bank=0102&description=OutletCaricuao" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn"
                    style={{ flex: 1, textDecoration: 'none', background: '#eb1c24', color: 'white', border: 'none', fontSize: '0.8rem' }}
                  >
                    Abrir BDV
                  </a>
                )}
                <button 
                  onClick={() => {
                    const text = `Pago Móvil Outlet Caricuao:%0A- Tel: 04129734013%0A- CI: 21346892%0A- Banco: 0102 (Venezuela)%0A- Monto: ${formatCurrency(newSale.paymentMethod === 'SHARED' ? newSale.sharedVes : getGrandTotal() * getActiveRate(), 'VES')}`;
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                  }}
                  className="btn"
                  style={{ flex: 1, background: '#25D366', color: 'white', border: 'none', fontSize: '0.8rem' }}
                >
                  <Share2 size={16} /> Enviar Datos
                </button>
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
                onClick={closeModal} 
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
              
              <button onClick={closeModal} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', background: 'linear-gradient(45deg, #f09433, #bc1888)' }}>
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
            className="modal-overlay"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="premium-card modal-content receipt-modal"
              style={{ maxWidth: '450px', padding: '0' }}
            >
               <div className="receipt-container" id="printable-receipt" style={{ padding: '2rem', background: 'white', color: '#000', borderRadius: '16px', fontFamily: "'Courier New', Courier, monospace" }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ margin: '0', fontSize: '1.2rem' }}>Recibo de Pago - Outlet Caricuao</h2>
                  <div style={{ margin: '0.5rem 0' }}>----------------------------------</div>
                </div>
                
                <div style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
                  <div><strong>Cliente:</strong> {selectedReceipt.customerName}</div>
                  <div><strong>Cédula:</strong> {selectedReceipt.customerID || ''}</div>
                  <div><strong>Fecha:</strong> {new Date(selectedReceipt.date).toLocaleDateString()}</div>
                  <div style={{ margin: '0.5rem 0' }}>----------------------------------</div>
                  <div><strong>Articulo:</strong> {selectedReceipt.itemName}</div>
                  <div><strong>Cantidad:</strong> {selectedReceipt.quantity}</div>
                  <div><strong>Total USD:</strong> {formatCurrency(selectedReceipt.totalUsd)}</div>
                  <div><strong>Total VES:</strong> {formatCurrency(selectedReceipt.totalVes, 'VES')}</div>
                  <div><strong>Tasa:</strong> {formatCurrency(selectedReceipt.rate, 'VES')} ({selectedReceipt.rateType?.toUpperCase()})</div>
                  <div><strong>Metodo:</strong> {selectedReceipt.paymentMethod}</div>
                  <div style={{ margin: '0.5rem 0' }}>----------------------------------</div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <div>¡Gracias por tu compra! 👗</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Atendido por: {selectedReceipt.sellerName || 'Personal Autorizado'}</div>
                </div>
                <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.65rem', color: '#aaa', borderTop: '1px dashed #ddd', paddingTop: '0.75rem' }}>
                  © Creativeweb IA 2026 - Todos los Derechos Reservados - ContactoCreativeweb@gmail.com
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
                  onClick={() => openModal('delivery', selectedReceipt)} 
                  className="btn btn-primary"
                  style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--accent)', border: 'none' }}
                >
                  <Truck size={18} /> Nota de Entrega
                </button>
                <button onClick={closeModal} className="btn-secondary" style={{ flex: '0 0 auto', padding: '0.75rem' }}>
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
              className="modal-overlay"
            >
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                className="delivery-modal premium-card"
                style={{ width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', background: 'white' }}
                id="delivery-note-root"
              >
                {/* ─── Printable area ─── */}
                <div id="printable-delivery" style={{ padding: '2rem', background: 'white', color: '#000', borderRadius: '16px', fontFamily: "'Courier New', Courier, monospace" }}>
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: '0', fontSize: '1.2rem' }}>Recibo de Pago - Outlet Caricuao</h2>
                    <div style={{ margin: '0.5rem 0' }}>----------------------------------</div>
                  </div>
                  
                  <div style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
                    <div><strong>Cliente:</strong> {s.customerName}</div>
                    <div><strong>Cédula:</strong> {s.customerID || ''}</div>
                    <div><strong>Fecha:</strong> {new Date(s.date).toLocaleDateString()}</div>
                    <div style={{ margin: '0.5rem 0' }}>----------------------------------</div>
                    <div><strong>Articulo:</strong> {s.itemName}</div>
                    <div><strong>Cantidad:</strong> {s.quantity}</div>
                    <div><strong>Total USD:</strong> {formatCurrency(s.totalUsd)}</div>
                    <div><strong>Total VES:</strong> {formatCurrency(s.totalVes, 'VES')}</div>
                    <div><strong>Tasa:</strong> {formatCurrency(s.rate, 'VES')} ({s.rateType?.toUpperCase()})</div>
                    <div><strong>Metodo:</strong> {s.paymentMethod}</div>
                    <div style={{ margin: '0.5rem 0' }}>----------------------------------</div>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <div>¡Gracias por tu compra! 👗</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Atendido por: {s.sellerName || 'Personal Autorizado'}</div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.65rem', color: '#aaa', borderTop: '1px dashed #ddd', paddingTop: '0.75rem' }}>
                    © Creativeweb IA 2026 - Todos los Derechos Reservados - Contactocreativeweb@gmail.com
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
                    onClick={closeModal}
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

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            style={{
              position: 'fixed',
              bottom: '2rem',
              left: '50%',
              zIndex: 10000,
              padding: '1rem 2rem',
              borderRadius: '16px',
              background: toast.type === 'success' ? 'var(--success)' : (toast.type === 'warning' ? 'var(--warning)' : 'var(--accent)'),
              color: 'white',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              fontWeight: '600',
              textAlign: 'center',
              minWidth: '280px',
              pointerEvents: 'none'
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <footer style={{ marginTop: '3rem', padding: '2rem 1rem', textAlign: 'center', opacity: 0.4, fontSize: '0.7rem' }} className="no-print">
        <div>Outlet Caricuao PWA v4.1.3 - Sincronizada con BCV Oficial</div>
        <div style={{ marginTop: '0.5rem', fontWeight: '600' }}>© Creativeweb IA 2026 - Todos los Derechos Reservados - Contactocreativeweb@gmail.com</div>
      </footer>
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
