import { useRoutes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { useAppStore } from './stores/appStore'
import { routes } from './router'
import { ForceUpdateModal } from './components/ForceUpdateModal'
import { SplashScreen } from './components/SplashScreen'

// 检测是否为 splash 窗口（通过 hash 路由区分）
const isSplashWindow = window.location.hash === '#/splash'

function SplashApp() {
  return (
    <SplashScreen
      onFinish={() => {
        window.electronAPI?.splashFinished?.()
      }}
    />
  )
}

function MainApp() {
  const element = useRoutes(routes)
  const { theme } = useAppStore()

  return (
    <>
      {element}
      <ForceUpdateModal />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme === 'dark' ? 'dark' : 'light'}
      />
    </>
  )
}

function App() {
  return isSplashWindow ? <SplashApp /> : <MainApp />
}

export default App
