export default function LanguageToggle({ language, onSwitch }) {
  return (
    <div className="lang-toggle">
      <button
        className={`lang-btn${language === 'c' ? ' active' : ''}`}
        onClick={() => onSwitch('c')}
      >
        C
      </button>
      <button
        className={`lang-btn${language === 'cpp' ? ' active' : ''}`}
        onClick={() => onSwitch('cpp')}
      >
        C++
      </button>
    </div>
  )
}
