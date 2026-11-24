import { useEffect, useRef, useState } from 'react'
import './App.css'
import cottonImage from './assets/crops/cotton.jpg'
import sesameImage from './assets/crops/sesame.jpg'
import matookeImage from './assets/crops/matooke.jpg'
import greenBeansImage from './assets/crops/green-beans.jpg'
import tobaccoImage from './assets/crops/tobacco.jpg'
import chiliImage from './assets/crops/chili.jpg'
import supportAvatar from './assets/crops/support-avatar.jpg'
import tropicalHeaderImage from './assets/crops/tropical-header.jpg'

const projectImages = {
  cotton: cottonImage,
  sesame: sesameImage,
  matooke: matookeImage,
  'green-beans': greenBeansImage,
  tobacco: tobaccoImage,
  chili: chiliImage,
}

const navigationItems = [
  { label: 'Home', icon: 'home' },
  { label: 'Order', icon: 'order' },
  { label: 'Chat', icon: 'chat' },
  { label: 'Wallet', icon: 'wallet' },
  { label: 'Me', icon: 'me' },
]


function NavigationIcon({ name }) {
  const iconPaths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1Z" /><path d="M8 21v-7h8v7" /></>,
    order: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 3.5v3h6v-3M8.5 11h7M8.5 15h7" /></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5.5A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2.5" /><path d="M3 9h18M16 14h2" /><path d="M6 5V3.5A1.5 1.5 0 0 1 7.5 2H18" /></>,
    me: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[name]}
    </svg>
  )
}


function ProfileMenuIcon({ name }) {
  const icons = {
    support: <><path d="M4 13v-2a8 8 0 0 1 16 0v2" /><path d="M4 13h3v6H6a2 2 0 0 1-2-2v-4Zm16 0h-3v6h1a2 2 0 0 0 2-2v-4ZM17 19a5 5 0 0 1-5 2" /></>,
    password: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    faq: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.3 2.3 0 1 1 3.6 1.9c-.9.6-1.4 1-1.4 2.1M12 16.5h.01" /></>,
    about: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    feedback: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5.5A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8 11h8M8 14h5" /></>,
    signout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}

const profileItems = [
  { label: 'Customer Service', icon: 'support' },
  { label: 'Change Password', icon: 'password' },
  { label: 'FAQ', icon: 'faq' },
  { label: 'About Us', icon: 'about' },
  { label: 'Feedback', icon: 'feedback' },
  { label: 'Sign out', icon: 'signout' },
]

const formatMoney = amount => amount.toLocaleString('en-US')
const dailyYield = project => Math.floor(project.price * project.dailyYieldBps / 10000)
const totalProjectYield = project => (
  project.durationDays === null ? null : dailyYield(project) * project.durationDays
)

function MessageContent({ text }) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, index) => (
    /^https?:\/\//.test(part)
      ? <a key={`${part}-${index}`} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
      : part
  ))
}

function PasswordVisibilityIcon({ visible }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="M2.5 12s3.4-6.25 9.5-6.25S21.5 12 21.5 12 18.1 18.25 12 18.25 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.7" />
      {!visible && (
        <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      )}
    </svg>
  )
}

function App() {
  const [authMode, setAuthMode] = useState(() => (
    new URLSearchParams(globalThis.location?.search ?? '').has('ref') ? 'register' : 'login'
  ))
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSupportUser, setIsSupportUser] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [authError, setAuthError] = useState('')
  const [userLabel, setUserLabel] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [userReferralCode, setUserReferralCode] = useState('')
  const [referralInput, setReferralInput] = useState(() => (
    new URLSearchParams(globalThis.location?.search ?? '').get('ref')?.toUpperCase() ?? ''
  ))
  const [referralNotice, setReferralNotice] = useState('')
  const [projects, setProjects] = useState([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [projectsError, setProjectsError] = useState('')
  const [investments, setInvestments] = useState([])
  const [investmentsLoading, setInvestmentsLoading] = useState(false)
  const [investmentsError, setInvestmentsError] = useState('')
  const [investmentsRevision, setInvestmentsRevision] = useState(0)
  const [removingInvestmentId, setRemovingInvestmentId] = useState('')
  const [investmentNotice, setInvestmentNotice] = useState('')
  const [investmentError, setInvestmentError] = useState('')
  const [submittingProjectId, setSubmittingProjectId] = useState('')
  const investmentRequestKeys = useRef(new Map())
  const [activePage, setActivePage] = useState('Home')
  const [activeEarnStep, setActiveEarnStep] = useState('Earn Now')
  const [chatMessages, setChatMessages] = useState([])
  const [chatDraft, setChatDraft] = useState('')
  const [chatRevision, setChatRevision] = useState(0)
  const [chatError, setChatError] = useState('')
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false)
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [supportConversations, setSupportConversations] = useState([])
  const [selectedSupportUserId, setSelectedSupportUserId] = useState('')
  const [supportThreadMessages, setSupportThreadMessages] = useState([])
  const [supportReplyDraft, setSupportReplyDraft] = useState('')
  const [supportError, setSupportError] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)
  const [isSendingSupportReply, setIsSendingSupportReply] = useState(false)
  const [supportRevision, setSupportRevision] = useState(0)
  const [walletNotice, setWalletNotice] = useState('')
  const [walletBalanceUgx, setWalletBalanceUgx] = useState('0')
  const [walletTransactions, setWalletTransactions] = useState([])
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletError, setWalletError] = useState('')
  const [walletRevision, setWalletRevision] = useState(0)
  const [editingBank, setEditingBank] = useState(false)
  const [bankPhone, setBankPhone] = useState('')
  const [bankPhoneDraft, setBankPhoneDraft] = useState('')
  const [profileDialog, setProfileDialog] = useState('')
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false)
  const [passwordChangeError, setPasswordChangeError] = useState('')
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/auth/me')
      .then(async response => {
        if (response.status === 401) return
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to restore your session.')
        if (active) {
          setUserLabel(result.user.fullName)
          setUserPhone(result.user.phone)
          setUserReferralCode(result.user.referralCode || '')
          setIsSupportUser(Boolean(result.user.isSupport))
          setIsAuthenticated(true)
        }
      })
      .catch(() => {
        if (active) setAuthError('Unable to connect to the CrestEarn API. Start the backend and check PostgreSQL.')
      })
      .finally(() => {
        if (active) setIsCheckingSession(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return undefined

    let active = true
    fetch('/api/projects')
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to load projects.')
        if (active) setProjects(result.projects)
      })
      .catch(() => {
        if (active) setProjectsError('Unable to load projects. Check your API and database connection.')
      })
      .finally(() => {
        if (active) setProjectsLoaded(true)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || activePage !== 'Order') return undefined

    let active = true
    fetch('/api/investments')
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to load your orders.')
        if (active) setInvestments(result.investments)
      })
      .catch(error => {
        if (active) {
          setInvestmentsError(error instanceof TypeError
            ? 'Unable to connect to the CrestEarn API.'
            : error.message)
        }
      })
      .finally(() => {
        if (active) setInvestmentsLoading(false)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated, activePage, investmentsRevision])

  useEffect(() => {
    if (!isAuthenticated || activePage !== 'Wallet') return undefined

    let active = true
    fetch('/api/wallet')
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to load your wallet.')
        if (active) {
          setWalletBalanceUgx(result.balanceUgx)
          setWalletTransactions(result.transactions)
        }
      })
      .catch(error => {
        if (active) {
          setWalletError(error instanceof TypeError
            ? 'Unable to connect to the CrestEarn API.'
            : error.message)
        }
      })
      .finally(() => {
        if (active) setWalletLoading(false)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated, activePage, walletRevision])

  useEffect(() => {
    if (!isAuthenticated) return undefined
    let active = true
    const refreshUnread = async () => {
      try {
        const response = await fetch(isSupportUser
          ? '/api/support/conversations'
          : '/api/chat/unread', { cache: 'no-store' })
        if (!response.ok) return
        const result = await response.json()
        if (active) {
          setUnreadChatCount(isSupportUser
            ? result.conversations.reduce((total, conversation) => total + conversation.unreadCount, 0)
            : result.unreadCount)
        }
      } catch {
        // The support badge can refresh on the next poll if the API is offline.
      }
    }
    refreshUnread()
    const timer = setInterval(refreshUnread, 8000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [isAuthenticated, isSupportUser])

  useEffect(() => {
    if (!isAuthenticated || activePage !== 'Chat' || isSupportUser) return undefined
    let active = true
    const loadMessages = async () => {
      try {
        const response = await fetch('/api/chat/messages', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to load support messages.')
        if (active) {
          setChatMessages(result.messages.map(message => ({
            id: message.id,
            text: message.body,
            time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            outgoing: message.sender === 'user',
          })))
          setChatError('')
          setUnreadChatCount(0)
        }
      } catch (error) {
        if (active) setChatError(error instanceof TypeError
          ? 'Unable to connect to the CrestEarn API.'
          : error.message)
      }
    }
    loadMessages()
    const timer = setInterval(loadMessages, 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [isAuthenticated, activePage, isSupportUser, chatRevision])

  useEffect(() => {
    if (!isAuthenticated || activePage !== 'Chat' || !isSupportUser) return undefined
    let active = true
    const loadConversations = async () => {
      try {
        const response = await fetch('/api/support/conversations', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to load the support inbox.')
        if (active) {
          setSupportConversations(result.conversations)
          setSupportError('')
          setUnreadChatCount(result.conversations.reduce((total, conversation) => total + conversation.unreadCount, 0))
          setSelectedSupportUserId(current => current || result.conversations[0]?.userId || '')
        }
      } catch (error) {
        if (active) setSupportError(error instanceof TypeError
          ? 'Unable to connect to the CrestEarn API.'
          : error.message)
      }
    }
    loadConversations()
    const timer = setInterval(loadConversations, 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [isAuthenticated, activePage, isSupportUser])

  useEffect(() => {
    if (!isAuthenticated || activePage !== 'Chat' || !isSupportUser || !selectedSupportUserId) return undefined
    let active = true
    const loadThread = async () => {
      try {
        const response = await fetch(`/api/support/conversations/${selectedSupportUserId}/messages`, { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to load this conversation.')
        if (active) {
          setSupportThreadMessages(result.messages.map(message => ({
            id: message.id,
            text: message.body,
            time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            outgoing: message.sender === 'support',
          })))
          setSupportError('')
        }
      } catch (error) {
        if (active) setSupportError(error instanceof TypeError
          ? 'Unable to connect to the CrestEarn API.'
          : error.message)
      }
    }
    loadThread()
    const timer = setInterval(loadThread, 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [isAuthenticated, activePage, isSupportUser, selectedSupportUserId, supportRevision])

  const projectsLoading = isAuthenticated && !projectsLoaded && !projectsError

  const handleAuthSubmit = async event => {
    event.preventDefault()
    setAuthError('')
    const formData = new FormData(event.currentTarget)

    if (authMode === 'register') {
      if (formData.get('password') !== formData.get('confirmPassword')) {
        setAuthError('Your passwords do not match.')
        return
      }
    }

    const payload = {
      phone: formData.get('phone'),
      password: formData.get('password'),
    }
    if (authMode === 'register') {
      payload.fullName = formData.get('fullName')
      if (referralInput.trim()) payload.referralCode = referralInput.trim().toUpperCase()
    }

    setIsSubmittingAuth(true)
    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        setAuthError(result.error || 'Unable to authenticate.')
        return
      }

      setUserLabel(result.user.fullName)
      setUserPhone(result.user.phone)
      setUserReferralCode(result.user.referralCode || '')
      setIsSupportUser(Boolean(result.user.isSupport))
      setProjects([])
      setProjectsLoaded(false)
      setProjectsError('')
      setActivePage('Home')
      setIsAuthenticated(true)
    } catch (error) {
      setAuthError(error instanceof TypeError
        ? 'Unable to connect to the CrestEarn API. Start the backend and check PostgreSQL.'
        : 'The sign-in request could not be completed.')
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Unable to sign out. Please try again.')
      setIsAuthenticated(false)
      setAuthMode('login')
      setProjects([])
      setProjectsLoaded(false)
      setInvestments([])
      setInvestmentsError('')
      setInvestmentError('')
      setInvestmentNotice('')
      investmentRequestKeys.current.clear()
      setWalletBalanceUgx('0')
      setWalletTransactions([])
      setWalletError('')
      setUserReferralCode('')
      setIsSupportUser(false)
      setUnreadChatCount(0)
      setActivePage('Home')
    } catch (error) {
      setProfileDialog(error.message)
    }
  }

  const featuredProjects = projects.filter(project => project.featured)
  const hotProducts = projects.filter(project => !project.featured)
  const referralLink = userReferralCode
    ? `${globalThis.location?.origin ?? ''}/?ref=${encodeURIComponent(userReferralCode)}`
    : ''

  const copyReferralLink = async () => {
    if (!referralLink || !navigator.clipboard?.writeText) {
      setReferralNotice('Your referral link is not available to copy yet.')
      return
    }
    try {
      await navigator.clipboard.writeText(referralLink)
      setReferralNotice('Referral link copied. Share it with a friend.')
    } catch {
      setReferralNotice('Could not copy the referral link. Please try again.')
    }
  }

  const handleInvest = async project => {
    setInvestmentError('')
    setInvestmentNotice('')
    setSubmittingProjectId(project.id)

    try {
      if (!globalThis.crypto?.randomUUID) {
        throw new Error('Secure request IDs are not available in this browser.')
      }

      let idempotencyKey = investmentRequestKeys.current.get(project.id)
      if (!idempotencyKey) {
        idempotencyKey = globalThis.crypto.randomUUID()
        investmentRequestKeys.current.set(project.id, idempotencyKey)
      }

      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ projectId: project.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to create an investment request.')

      investmentRequestKeys.current.delete(project.id)
      setInvestmentNotice(
        `${project.name} request saved as pending. Payment is not available, so no funds were taken and no yields were added.`,
      )
      setInvestmentsLoading(true)
      setInvestmentsError('')
      setActivePage('Order')
    } catch (error) {
      setInvestmentError(error instanceof TypeError
        ? 'Unable to connect to the CrestEarn API. Please try again.'
        : error.message)
    } finally {
      setSubmittingProjectId('')
    }
  }

  const handleRemoveInvestment = async investment => {
    setInvestmentsError('')
    setRemovingInvestmentId(investment.id)
    try {
      const response = await fetch(`/api/investments/${investment.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to remove this order.')
      setInvestments(previous => previous.filter(item => item.id !== investment.id))
      setInvestmentNotice('Pending order removed. No funds were taken.')
    } catch (error) {
      setInvestmentsError(error instanceof TypeError
        ? 'Unable to connect to the CrestEarn API.'
        : error.message)
    } finally {
      setRemovingInvestmentId('')
    }
  }

  const handleChatSubmit = async event => {
    event.preventDefault()
    const text = chatDraft.trim()
    if (!text || isSendingChatMessage) return
    setIsSendingChatMessage(true)
    setChatError('')
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to send your message.')
      setChatMessages(previous => [...previous, {
        id: result.message.id,
        text: result.message.body,
        time: new Date(result.message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        outgoing: true,
      }])
      setChatDraft('')
      setChatRevision(revision => revision + 1)
    } catch (error) {
      setChatError(error instanceof TypeError
        ? 'Unable to connect to the CrestEarn API.'
        : error.message)
    } finally {
      setIsSendingChatMessage(false)
    }
  }

  const handleSupportReply = async event => {
    event.preventDefault()
    const body = supportReplyDraft.trim()
    if (!body || !selectedSupportUserId || isSendingSupportReply) return
    setIsSendingSupportReply(true)
    setSupportError('')
    try {
      const response = await fetch(`/api/support/conversations/${selectedSupportUserId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to send the reply.')
      setSupportReplyDraft('')
      setSupportRevision(revision => revision + 1)
    } catch (error) {
      setSupportError(error instanceof TypeError
        ? 'Unable to connect to the CrestEarn API.'
        : error.message)
    } finally {
      setIsSendingSupportReply(false)
    }
  }

  const copyInvitationCode = () => {
    if (!navigator.clipboard?.writeText) {
      setProfileDialog('Copy is unavailable in this browser.')
      return
    }

    navigator.clipboard.writeText(userReferralCode).then(
      () => setProfileDialog('Invitation code copied.'),
      () => setProfileDialog('Could not copy the invitation code.'),
    )
  }

  const handlePasswordChange = async event => {
    event.preventDefault()
    setPasswordChangeError('')
    setPasswordChangeSuccess('')
    const form = event.currentTarget
    const formData = new FormData(form)
    const currentPassword = formData.get('currentPassword')
    const newPassword = formData.get('newPassword')
    const confirmPassword = formData.get('confirmPassword')

    if (newPassword !== confirmPassword) {
      setPasswordChangeError('Your new passwords do not match.')
      return
    }

    setIsChangingPassword(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to update your password.')
      form.reset()
      setPasswordChangeSuccess('Your password has been changed. Other signed-in sessions have been logged out.')
    } catch (error) {
      setPasswordChangeError(error instanceof TypeError
        ? 'Unable to connect to CrestEarn. Please try again.'
        : error.message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (isCheckingSession) {
    return (
      <main className="auth-page auth-loading">
        <p>Checking your CrestEarn session...</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="auth-page">
        <section className="auth-showcase">
          <div className="auth-logo">
            <span className="auth-logo-mark" aria-hidden="true">CE</span>
            <span>Crest<strong>Earn</strong></span>
          </div>
          <div className="auth-message">
            <span className="auth-eyebrow">INVEST · GROW · EARN</span>
            <h1>Grow with the land.</h1>
            <p>Explore agricultural projects and follow your investment journey with CrestEarn.</p>
          </div>
          <div className="auth-crop-strip" aria-hidden="true">
            <img src={matookeImage} alt="" />
            <img src={cottonImage} alt="" />
            <img src={sesameImage} alt="" />
          </div>
          <p className="auth-showcase-note">Supporting agricultural growth in local communities.</p>
        </section>

        <section className="auth-panel">
          <div className="auth-card">
            <div className="auth-tabs" role="tablist" aria-label="Account access">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'login'}
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => {
                  setAuthMode('login')
                  setAuthError('')
                }}
              >
                Log In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'register'}
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => {
                  setAuthMode('register')
                  setAuthError('')
                }}
              >
                Register
              </button>
            </div>

            <div className="auth-heading">
              <span>{authMode === 'login' ? 'Welcome back' : 'Get started'}</span>
              <h2>{authMode === 'login' ? 'Log in to CrestEarn' : 'Create your account'}</h2>
              <p>
                {authMode === 'login'
                  ? 'Enter your details to continue.'
                  : 'Join CrestEarn and explore agricultural projects.'}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <div className="auth-field">
                  <label htmlFor="full-name">Full name</label>
                  <input id="full-name" name="fullName" type="text" autoComplete="name" placeholder="Enter your full name" required />
                </div>
              )}

              {authMode === 'register' && (
                <div className="auth-field">
                  <label htmlFor="referral-code">Referral code (optional)</label>
                  <input
                    id="referral-code"
                    name="referralCode"
                    type="text"
                    autoComplete="off"
                    placeholder="Enter a friend’s referral code"
                    value={referralInput}
                    onChange={event => setReferralInput(event.target.value.toUpperCase())}
                  />
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="phone">Phone number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="e.g. 07XXXXXXXX"
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    minLength={8}
                    placeholder="At least 8 characters"
                    required
                  />
                  <button
                    className="password-visibility"
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(visible => !visible)}
                  >
                    <PasswordVisibilityIcon visible={showPassword} />
                  </button>
                </div>
              </div>

              {authMode === 'register' && (
                <div className="auth-field">
                  <label htmlFor="confirm-password">Confirm password</label>
                  <div className="password-input-wrap">
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      placeholder="Re-enter your password"
                      required
                    />
                    <button
                      className="password-visibility"
                      type="button"
                      aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                      aria-pressed={showConfirmPassword}
                      onClick={() => setShowConfirmPassword(visible => !visible)}
                    >
                      <PasswordVisibilityIcon visible={showConfirmPassword} />
                    </button>
                  </div>
                </div>
              )}

              {authError && <p className="auth-error" role="alert">{authError}</p>}

              <button className="auth-submit" type="submit" disabled={isSubmittingAuth}>
                {isSubmittingAuth
                  ? 'Please wait...'
                  : authMode === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>

            <p className="auth-switch">
              {authMode === 'login' ? 'New to CrestEarn?' : 'Already have an account?'}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login')
                  setAuthError('')
                }}
              >
                {authMode === 'login' ? 'Create account' : 'Log in'}
              </button>
            </p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <div className={`app-shell ${activePage === 'Chat' ? 'chat-shell' : ''}`}>
      {activePage === 'Home' && (
        <header className="balance-header">
          <button
            className="messages-button"
            aria-label="Open announcements"
            onClick={() => setIsAnnouncementOpen(true)}
          >
            <svg className="announcement-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11v2a2 2 0 0 0 2 2h2l8 4V5l-8 4H5a2 2 0 0 0-2 2Z" />
              <path d="M7 15l1.5 5h3L10 16.5M18 9l3-2M18 15l3 2M18 12h4" />
            </svg>
            <span className="message-count">NEW</span>
          </button>

          <div className="balance-label">
            <span className="coin-icon">🪙</span>
            <span>Available balance (UGX)</span>
          </div>

          <div className="balance-row">
            <strong className="balance-amount">0</strong>
            <div className="balance-actions">
              <button className="recharge-button" onClick={() => setActivePage('Wallet')}>
                Recharge
              </button>
              <button className="withdrawal-button" onClick={() => setActivePage('Wallet')}>
                Withdrawal
              </button>
            </div>
          </div>
        </header>
      )}

      {isAnnouncementOpen && (
        <div className="announcement-backdrop" role="presentation" onClick={() => setIsAnnouncementOpen(false)}>
          <section className="announcement-dialog" role="dialog" aria-modal="true" aria-labelledby="announcement-title" onClick={event => event.stopPropagation()}>
            <div className="announcement-dialog-topline">
              <span>CRESTEARN ANNOUNCEMENT</span>
              <button type="button" aria-label="Close announcement" onClick={() => setIsAnnouncementOpen(false)}>?</button>
            </div>
            <span className="announcement-new-label">NEW</span>
            <h2 id="announcement-title">Withdrawal service update</h2>
            <p>Withdrawal requests are not available yet. We?ll post an announcement here when the service is ready.</p>
            <button type="button" className="announcement-dismiss" onClick={() => setIsAnnouncementOpen(false)}>Got it</button>
          </section>
        </div>
      )}

      {activePage === 'Order' && (
        <header className="balance-header order-balance-header">
          <div className="balance-label">
            <span className="coin-icon">🪙</span>
            <span>Available balance</span>
          </div>
          <div className="order-balance-row">
            <strong>UGX 0</strong>
            <button className="recharge-button" onClick={() => setActivePage('Wallet')}>
              Withdrawal
            </button>
          </div>
        </header>
      )}

      <main className={`dashboard-content ${activePage === 'Chat' ? 'chat-content' : ''}`}>
        {activePage === 'Home' ? (
          <>
            {investmentError && (
              <p className="project-status error" role="alert">{investmentError}</p>
            )}
            <section className="how-to-section">
              <h1><span>🪙</span> How to Earn?</h1>
              <div className="earning-steps">
                {['Earn Now', 'Invite Friend', 'Unlock Rewards'].map((step, index) => (
                  <button
                    className={`earning-step ${activeEarnStep === step ? 'active' : ''}`}
                    key={step}
                    onClick={() => setActiveEarnStep(step)}
                  >
                    {index > 0 && <span className="step-number">{index + 1}</span>}
                    {index === 0 && <span className="play-icon">▶</span>}
                    <span>{step}</span>
                  </button>
                ))}
              </div>
              {activeEarnStep === 'Invite Friend' && (
                <div className="referral-invite-card">
                  <div className="referral-invite-heading">
                    <span className="referral-icon" aria-hidden="true">↗</span>
                    <div>
                      <h2>Invite a friend</h2>
                      <p>Earn a 10% referral bonus on each friend’s first confirmed deposit.</p>
                    </div>
                  </div>
                  <label htmlFor="referral-link">Your referral link</label>
                  <div className="referral-link-row">
                    <input id="referral-link" value={referralLink} readOnly aria-label="Your referral link" />
                    <button type="button" onClick={copyReferralLink} disabled={!referralLink}>Copy link</button>
                  </div>
                  <p className="referral-note">The bonus is added to your wallet only after your friend’s deposit is confirmed and posted.</p>
                  {referralNotice && <p className="referral-notice" role="status">{referralNotice}</p>}
                </div>
              )}
            </section>

            <section className="why-project">
              <h2>Why this Project?</h2>
              <ul>
                <li>Supports agricultural development and crop production in local communities.</li>
                <li>Funds are used for planting, harvesting, and related farm operations.</li>
                <li>Returns depend on project performance and market results.</li>
              </ul>
            </section>

            <section className="featured-projects">
              <header className="featured-heading">
                <div>
                  <span className="featured-eyebrow">FEATURED PROJECTS</span>
                  <h2>Popular investment projects</h2>
                </div>
                <span className="featured-count">{featuredProjects.length} projects</span>
              </header>
              <p className="featured-intro">Explore agricultural projects available on CrestEarn.</p>
              <div className="featured-grid">
                {featuredProjects.map(project => (
                  <article className="featured-card" key={project.id}>
                    <div className="featured-image">
                      {projectImages[project.imageKey]
                        ? <img src={projectImages[project.imageKey]} alt={project.name} />
                        : <div className="project-image-missing">{project.name}</div>}
                      <span className={`featured-term ${project.durationDays ? '' : 'term-pending'}`}>
                        {project.durationDays ? `${project.durationDays} day term` : 'Terms pending'}
                      </span>
                    </div>
                    <div className="featured-details">
                      <h3>{project.name}</h3>
                      <div className="featured-entry-price">
                        <span>Entry price</span>
                        <strong className="featured-price">UGX {formatMoney(project.price)}</strong>
                        {project.previousPrice !== null && (
                          <del>UGX {formatMoney(project.previousPrice)}</del>
                        )}
                      </div>
                      <div className="featured-metric">
                        <span>Indicative daily estimate</span>
                        <strong>UGX {formatMoney(dailyYield(project))}</strong>
                      </div>
                      <button
                        disabled={!project.durationDays || Boolean(submittingProjectId)}
                        onClick={() => handleInvest(project)}
                        title={project.durationDays ? undefined : 'A project duration must be confirmed before requests can be opened.'}
                      >
                        {!project.durationDays
                          ? 'Coming soon'
                          : submittingProjectId === project.id ? 'Submitting...' : 'View project'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <p className="featured-disclaimer">Daily estimates use the configured project rate and are illustrative only. They are not guaranteed returns or available payouts.</p>
              {projectsLoading && <p className="project-status">Loading projects...</p>}
              {projectsError && <p className="project-status error" role="alert">{projectsError}</p>}
              {!projectsLoading && !projectsError && featuredProjects.length === 0 && (
                <p className="project-status">No featured projects are available.</p>
              )}
            </section>

            <section className="hot-products">
              <h2>Hot Products</h2>
              <div className="hot-product-list">
                {hotProducts.map(product => (
                  <article className="hot-product-card" key={product.name}>
                    <div className="crop-image">
                      {projectImages[product.imageKey]
                        ? <img src={projectImages[product.imageKey]} alt="" />
                        : <div className="project-image-missing">{product.name}</div>}
                      <span className="days-badge">Days: {product.durationDays ?? '—'}</span>
                    </div>
                    <div className="hot-product-details">
                      <h3>{product.name}</h3>
                      <div className="income-grid">
                        <div>
                          <span>Total income</span>
                          <strong>
                            {totalProjectYield(product) === null
                              ? '—'
                              : formatMoney(totalProjectYield(product))}
                          </strong>
                        </div>
                        <div>
                          <span>Daily income</span>
                          <strong>{formatMoney(dailyYield(product))}</strong>
                        </div>
                      </div>
                      <div className="product-purchase">
                        <div className="product-price">
                          <span>Price:</span>
                          <strong>{formatMoney(product.price)}</strong>
                        </div>
                        <button
                          disabled={Boolean(submittingProjectId)}
                          onClick={() => handleInvest(product)}
                        >
                          {submittingProjectId === product.id ? 'Submitting...' : 'Invest'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {projectsLoading && <p className="project-status">Loading projects...</p>}
                {projectsError && <p className="project-status error" role="alert">{projectsError}</p>}
                {!projectsLoading && !projectsError && hotProducts.length === 0 && (
                  <p className="project-status">No products are available.</p>
                )}
              </div>
            </section>
          </>
        ) : activePage === 'Order' ? (
          <section className="order-page">
            <header className="investment-page-heading">
              <div>
                <h1>My Orders</h1>
                <p>Review your investment requests and their status.</p>
              </div>
              <button
                className="refresh-investments-button"
                disabled={investmentsLoading}
                onClick={() => {
                  setInvestmentsLoading(true)
                  setInvestmentsError('')
                  setInvestmentsRevision(revision => revision + 1)
                }}
              >
                {investmentsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </header>
            {investmentNotice && (
              <p className="investment-notice" role="status">{investmentNotice}</p>
            )}
            <p className="investment-payment-note">
              Payments are not connected. Pending requests do not take funds or earn yields.
            </p>
            {investmentsError && (
              <p className="project-status error" role="alert">{investmentsError}</p>
            )}
            {investmentsLoading ? (
              <p className="project-status">Loading your orders...</p>
            ) : !investmentsError && investments.length === 0 ? (
              <div className="empty-investments">
                <h2>No orders yet</h2>
                <p>Investment requests you create will appear here.</p>
                <button onClick={() => setActivePage('Home')}>Browse projects</button>
              </div>
            ) : (
              <div className="investment-list">
                {investments.map(investment => (
                  <article className="investment-card" key={investment.id}>
                    <div className="investment-card-header">
                      <div>
                        <small>REQUEST NUMBER</small>
                        <h2>{investment.id}</h2>
                      </div>
                      <div className="investment-card-actions">
                        <span className={`investment-status status-${investment.status}`}>
                          {investment.status === 'pending'
                            ? 'Pending payment'
                            : investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}
                        </span>
                        {investment.status === 'pending' && (
                          <button
                            className="investment-remove-button"
                            disabled={Boolean(removingInvestmentId)}
                            onClick={() => handleRemoveInvestment(investment)}
                          >
                            {removingInvestmentId === investment.id ? 'Removing…' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                    <h3>{investment.projectName}</h3>
                    <dl>
                      <div>
                        <dt>Project price</dt>
                        <dd>UGX {formatMoney(investment.principalUgx)}</dd>
                      </div>
                      <div>
                        <dt>Configured term</dt>
                        <dd>{investment.durationDays} days</dd>
                      </div>
                      <div>
                        <dt>Daily rate</dt>
                        <dd>{investment.dailyYieldBps / 100}%</dd>
                      </div>
                      <div>
                        <dt>Requested</dt>
                        <dd>{new Date(investment.createdAt).toLocaleString()}</dd>
                      </div>
                    </dl>
                    {investment.status === 'pending' && (
                      <p className="investment-pending-note">
                        Payment has not started. No money or yield has been applied.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : activePage === 'Chat' ? (
          isSupportUser ? (
            <section className="support-inbox-page">
              <header className="support-inbox-heading">
                <div>
                  <span>CRESTEARN</span>
                  <h1>Support inbox</h1>
                  <p>Member concerns and replies</p>
                </div>
                {unreadChatCount > 0 && <span className="support-unread-total">{unreadChatCount} new</span>}
              </header>
              {supportError && <p className="wallet-error" role="alert">{supportError}</p>}
              {supportConversations.length === 0 ? (
                <div className="support-empty-state">
                  <h2>No conversations yet</h2>
                  <p>Member messages will appear here when someone contacts support.</p>
                </div>
              ) : (
                <div className="support-inbox-layout">
                  <div className="support-conversation-list" aria-label="Member conversations">
                    {supportConversations.map(conversation => (
                      <button
                        type="button"
                        className={selectedSupportUserId === conversation.userId ? 'support-conversation active' : 'support-conversation'}
                        key={conversation.userId}
                        onClick={() => setSelectedSupportUserId(conversation.userId)}
                      >
                        <span className="support-conversation-name">{conversation.fullName}</span>
                        <span className="support-conversation-phone">{conversation.phone}</span>
                        <span className="support-conversation-preview">{conversation.lastMessage}</span>
                        {conversation.unreadCount > 0 && <span className="support-conversation-unread">{conversation.unreadCount}</span>}
                      </button>
                    ))}
                  </div>
                  {selectedSupportUserId && (
                    <section className="support-thread-panel" aria-label="Selected conversation">
                      <div className="support-thread-messages">
                        {supportThreadMessages.map(message => (
                          <article className={`chat-message ${message.outgoing ? 'outgoing' : ''}`} key={message.id}>
                            <p><MessageContent text={message.text} /></p>
                            <time>{message.time}</time>
                          </article>
                        ))}
                      </div>
                      <form className="chat-composer" onSubmit={handleSupportReply}>
                        <input
                          aria-label="Reply to member"
                          placeholder="Write a reply..."
                          maxLength={4000}
                          value={supportReplyDraft}
                          onChange={event => setSupportReplyDraft(event.target.value)}
                        />
                        <button type="submit" className="send-button" aria-label="Send reply" disabled={isSendingSupportReply || !supportReplyDraft.trim()}>
                          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                        </button>
                      </form>
                    </section>
                  )}
                </div>
              )}
            </section>
          ) : (
            <section className="chat-page">
              <header className="chat-heading">
                <span className="chat-support-mark" aria-hidden="true"><ProfileMenuIcon name="support" /></span>
                <div>
                  <h1>CrestEarn Support</h1>
                  <p>Send your concern and we?ll reply here.</p>
                </div>
              </header>
              {chatError && <p className="chat-error" role="alert">{chatError}</p>}
              <div
                className="chat-thread"
                style={{ backgroundImage: `linear-gradient(rgba(11, 32, 60, 0.48), rgba(11, 32, 60, 0.48)), url(${tropicalHeaderImage})` }}
              >
                {chatMessages.length === 0 && !chatError && (
                  <p className="chat-empty-state">
                    Your messages to support will appear here. For channel updates, join the official CrestEarn WhatsApp channel: {' '}
                    <MessageContent text="https://whatsapp.com/channel/0029VbDm5Md89ini47c4Jr0v" />
                  </p>
                )}
                {chatMessages.map(message => (
                  <article className={`chat-message ${message.outgoing ? 'outgoing' : ''}`} key={message.id}>
                    <p><MessageContent text={message.text} /></p>
                    <time>{message.time}</time>
                  </article>
                ))}
              </div>
              <form className="chat-composer" onSubmit={handleChatSubmit}>
                <input
                  aria-label="Send your concern to support"
                  placeholder="Write your concern..."
                  maxLength={4000}
                  value={chatDraft}
                  onChange={event => setChatDraft(event.target.value)}
                />
                <button type="submit" className="send-button" aria-label="Send message" disabled={isSendingChatMessage || !chatDraft.trim()}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                </button>
              </form>
            </section>
          )
        ) : activePage === 'Wallet' ? (
          <section className="wallet-page">
            <header
              className="wallet-hero"
              style={{ backgroundImage: `linear-gradient(rgba(11, 32, 60, 0.62), rgba(11, 32, 60, 0.62)), url(${tropicalHeaderImage})` }}
            >
              <div className="wallet-balance-label"><span>🪙</span> Balance</div>
              <h1>UGX {BigInt(walletBalanceUgx).toLocaleString('en-US')}</h1>
              <div className="wallet-hero-actions">
                <button className="withdrawal-button" onClick={() => setWalletNotice('Withdrawal is not connected yet.')}>
                  Withdrawal
                </button>
                <button className="recharge-button" onClick={() => setWalletNotice('Recharge is not connected yet.')}>
                  Recharge
                </button>
              </div>
            </header>

            <section className="wallet-transactions">
              <header>
                <div>
                  <h2>Transaction history</h2>
                  <p>Balance includes posted transactions only.</p>
                </div>
                <button
                  disabled={walletLoading}
                  onClick={() => {
                    setWalletLoading(true)
                    setWalletError('')
                    setWalletRevision(revision => revision + 1)
                  }}
                >
                  {walletLoading ? 'Loading...' : 'Refresh'}
                </button>
              </header>
              {walletError && <p className="wallet-error" role="alert">{walletError}</p>}
              {walletLoading ? (
                <p className="wallet-empty">Loading wallet transactions...</p>
              ) : !walletError && walletTransactions.length === 0 ? (
                <p className="wallet-empty">
                  No transactions yet. Deposits, withdrawals, and yield credits are not connected.
                </p>
              ) : (
                <div className="wallet-transaction-list">
                  {walletTransactions.map(transaction => {
                    const amount = BigInt(transaction.amountUgx)
                    return (
                      <article className="wallet-transaction" key={transaction.id}>
                        <div>
                          <h3>{transaction.transactionType.replace(/_/g, ' ')}</h3>
                          <time>{new Date(transaction.createdAt).toLocaleString()}</time>
                          {transaction.externalReference && (
                            <small>Reference: {transaction.externalReference}</small>
                          )}
                        </div>
                        <div className="wallet-transaction-value">
                          <strong className={amount < 0n ? 'debit' : 'credit'}>
                            UGX {amount > 0n ? '+' : ''}{amount.toLocaleString('en-US')}
                          </strong>
                          <span className={`wallet-transaction-status status-${transaction.status}`}>
                            {transaction.status}
                          </span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
            {walletNotice && <p className="wallet-notice" role="status">{walletNotice}</p>}

            <section className="bank-card">
              <div className="bank-card-art" aria-hidden="true">💳</div>
              {editingBank ? (
                <form
                  className="bank-card-edit"
                  onSubmit={event => {
                    event.preventDefault()
                    setBankPhone(bankPhoneDraft)
                    setEditingBank(false)
                  }}
                >
                  <label htmlFor="bank-phone">Bank phone number</label>
                  <input
                    id="bank-phone"
                    type="tel"
                    required
                    value={bankPhoneDraft}
                    onChange={event => setBankPhoneDraft(event.target.value)}
                  />
                  <button type="submit">Save</button>
                </form>
              ) : (
                <div className="bank-card-details">
                  <strong>Bank card</strong>
                  <span>{bankPhone || (userPhone ? `${userPhone.slice(0, 2)}••••${userPhone.slice(-2)}` : 'Add a phone number')}</span>
                  <button
                    onClick={() => {
                      setBankPhoneDraft(bankPhone || userPhone)
                      setEditingBank(true)
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </section>
          </section>
        ) : activePage === 'Me' ? (
          <section className="profile-page">
            <header
              className="profile-hero"
              style={{ backgroundImage: `linear-gradient(rgba(11, 32, 60, 0.55), rgba(11, 32, 60, 0.55)), url(${tropicalHeaderImage})` }}
            >
              <div className="profile-identity">
                <div>
                  <div className="profile-phone">
                    {userPhone || userLabel || 'CrestEarn member'}
                    <span>◆ VIP</span>
                  </div>
                  <div className="invitation-code">
                    Invitation code: {userReferralCode || 'Loading?'}
                    <button aria-label="Copy invitation code" onClick={copyInvitationCode}>▢</button>
                  </div>
                </div>
              </div>
            </header>

            <section className="vip-progress">
              <h1>VIP LV.0 Progress:</h1>
              <div className="vip-progress-track">
                <span>VIP</span>
                <div><i /></div>
                <strong>LV.0</strong>
              </div>
              <div className="vip-progress-labels">
                <strong>0 / 180,000</strong>
                <span>Next</span>
              </div>
            </section>

            <div className="profile-menu">
              {profileItems.map(item => (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.label === 'Sign out') {
                      handleSignOut()
                    } else if (item.label === 'Customer Service') {
                      setActivePage('Chat')
                    } else {
                      setPasswordChangeError('')
                      setPasswordChangeSuccess('')
                      setProfileDialog(item.label)
                    }
                  }}
                >
                  <span className="profile-menu-icon"><ProfileMenuIcon name={item.icon} /></span>
                  <span>{item.label}</span>
                  <span className="profile-chevron">›</span>
                </button>
              ))}
            </div>
            {profileDialog && (
              <div className="profile-dialog-backdrop" role="presentation" onClick={() => setProfileDialog('')}>
                <section className="profile-dialog" role="dialog" aria-modal="true" aria-label={profileDialog} onClick={event => event.stopPropagation()}>
                  <h2>{profileDialog}</h2>
                  {profileDialog === 'Change Password' ? (
                    <>
                      <p>Use your current password to set a new one. Choose at least 8 characters.</p>
                      <form className="profile-password-form" onSubmit={handlePasswordChange}>
                        <label htmlFor="current-password">Current password</label>
                        <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
                        <label htmlFor="new-password">New password</label>
                        <input id="new-password" name="newPassword" type="password" minLength="8" maxLength="128" autoComplete="new-password" required />
                        <label htmlFor="confirm-password">Confirm new password</label>
                        <input id="confirm-password" name="confirmPassword" type="password" minLength="8" maxLength="128" autoComplete="new-password" required />
                        {passwordChangeError && <p className="profile-dialog-error" role="alert">{passwordChangeError}</p>}
                        {passwordChangeSuccess && <p className="profile-dialog-success" role="status">{passwordChangeSuccess}</p>}
                        <div className="profile-dialog-actions">
                          <button type="button" className="profile-dialog-secondary" onClick={() => setProfileDialog('')}>Close</button>
                          <button type="submit" disabled={isChangingPassword}>{isChangingPassword ? 'Saving?' : 'Update password'}</button>
                        </div>
                      </form>
                    </>
                  ) : profileDialog === 'FAQ' ? (
                    <div className="profile-faq-list">
                      <details><summary>How do I place an investment request?</summary><p>Choose a project on Home and select Invest. Your request will appear in Order.</p></details>
                      <details><summary>When does an order start earning?</summary><p>Payment processing is not connected yet. Requests remain pending and do not take funds or earn yields.</p></details>
                      <details><summary>How is my wallet balance calculated?</summary><p>The wallet shows posted ledger entries only. Deposits, withdrawals, and payouts are not connected yet.</p></details>
                      <details><summary>How can I get help?</summary><p>Open Customer Service or Feedback on this page to go to the support chat.</p></details>
                    </div>
                  ) : profileDialog === 'About Us' ? (
                    <p>CrestEarn helps members explore agricultural projects, follow investment requests, and review wallet activity. Project requests and wallet tools are still being developed; no payment or yield is processed in the app yet.</p>
                  ) : profileDialog === 'Feedback' ? (
                    <>
                      <p>Share a comment or question with the CrestEarn support team through the support chat.</p>
                      <div className="profile-dialog-actions">
                        <button type="button" className="profile-dialog-secondary" onClick={() => setProfileDialog('')}>Close</button>
                        <button type="button" onClick={() => { setChatDraft('Feedback: '); setProfileDialog(''); setActivePage('Chat') }}>Open support chat</button>
                      </div>
                    </>
                  ) : (
                    <p>{profileDialog === 'Invitation code copied.' || profileDialog === 'Could not copy the invitation code.' || profileDialog === 'Copy is unavailable in this browser.'
                      ? profileDialog
                      : profileDialog === 'Sign out' ? 'Unable to sign out. Please try again.' : profileDialog}</p>
                  )}
                  {profileDialog !== 'Change Password' && profileDialog !== 'Feedback' && (
                    <button className="profile-dialog-close" onClick={() => setProfileDialog('')}>Close</button>
                  )}
                </section>
              </div>
            )}
          </section>
        ) : (
          <section className="section-placeholder">
            <h1>{activePage}</h1>
          </section>
        )}
      </main>

      <button className="support-button" aria-label="Contact support" onClick={() => setActivePage('Chat')}>
        <img src={supportAvatar} alt="" />
      </button>

      <nav className="bottom-navigation" aria-label="Main navigation">
        {navigationItems.map(item => (
          <button
            className={activePage === item.label ? 'nav-button active' : 'nav-button'}
            aria-current={activePage === item.label ? 'page' : undefined}
            key={item.label}
            onClick={() => {
              if (item.label === 'Order') {
                setInvestmentsLoading(true)
                setInvestmentsError('')
                setInvestmentsRevision(revision => revision + 1)
              }
              if (item.label === 'Wallet') {
                setWalletLoading(true)
                setWalletError('')
                setWalletRevision(revision => revision + 1)
              }
              setActivePage(item.label)
            }}
          >
            <span className="nav-icon"><NavigationIcon name={item.icon} /></span>
            <span>{item.label}</span>
            {item.label === 'Chat' && unreadChatCount > 0 && (
              <span className="nav-unread-count" aria-label={`${unreadChatCount} unread support messages`}>
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
