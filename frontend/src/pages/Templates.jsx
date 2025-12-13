import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Templates.css'

/**
 * Pagina Template-uri - generare documente.
 * Accesibilă pentru Expert, Management și Admin.
 */
function Templates() {
  const { user, isManagementOrAdmin } = useAuth()
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  // Lista de template-uri disponibile
  const templates = [
    {
      id: 'cerere_wp',
      name: 'Cerere Work Permit',
      description: 'Cerere pentru obținerea avizului de muncă (Work Permit)',
      icon: '📋',
      category: 'Aviz IGI',
    },
    {
      id: 'imputernicire',
      name: 'Împuternicire',
      description: 'Împuternicire pentru reprezentare la autorități',
      icon: '📝',
      category: 'General',
    },
    {
      id: 'cim',
      name: 'Contract Individual de Muncă',
      description: 'Model CIM conform legislației în vigoare',
      icon: '📄',
      category: 'Angajare',
    },
    {
      id: 'cerere_viza',
      name: 'Cerere Viză',
      description: 'Cerere pentru obținerea vizei de lungă ședere',
      icon: '🛂',
      category: 'Viză',
    },
    {
      id: 'declaratie_cazare',
      name: 'Declarație Cazare',
      description: 'Declarație privind asigurarea condițiilor de cazare',
      icon: '🏠',
      category: 'Cazare',
    },
    {
      id: 'cerere_ps',
      name: 'Cerere Permis de Ședere',
      description: 'Cerere pentru obținerea/prelungirea permisului de ședere',
      icon: '🪪',
      category: 'Permis Ședere',
    },
    {
      id: 'adeverinta_salariat',
      name: 'Adeverință Salariat',
      description: 'Adeverință de salariat pentru diverse instituții',
      icon: '📑',
      category: 'Angajare',
    },
    {
      id: 'act_aditional',
      name: 'Act Adițional CIM',
      description: 'Act adițional la contractul individual de muncă',
      icon: '📎',
      category: 'Angajare',
    },
  ]

  // Grupare pe categorii
  const categories = [...new Set(templates.map(t => t.category))]

  const handleGenerateTemplate = (template) => {
    // Placeholder - va fi implementat ulterior
    alert(`Funcționalitatea de generare "${template.name}" va fi implementată în curând.\n\nAceasta va permite selectarea lucrătorului și completarea automată a datelor în document.`)
  }

  return (
    <div className="templates-page">
      <header className="page-header">
        <div>
          <h1>📄 Template-uri Documente</h1>
          <p>Generează documente pre-completate pentru lucrători</p>
        </div>
      </header>

      <div className="templates-info card">
        <div className="info-icon">💡</div>
        <div className="info-content">
          <h3>Cum funcționează?</h3>
          <p>
            Selectează un template, alege lucrătorul și sistemul va genera automat 
            documentul cu datele pre-completate. Poți descărca documentul în format 
            Word sau PDF pentru editare ulterioară.
          </p>
        </div>
      </div>

      {categories.map(category => (
        <section key={category} className="template-category">
          <h2>{category}</h2>
          <div className="templates-grid">
            {templates
              .filter(t => t.category === category)
              .map(template => (
                <div 
                  key={template.id} 
                  className={`template-card card ${selectedTemplate === template.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="template-icon">{template.icon}</div>
                  <div className="template-info">
                    <h3>{template.name}</h3>
                    <p>{template.description}</p>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleGenerateTemplate(template)
                    }}
                  >
                    Generează
                  </button>
                </div>
              ))}
          </div>
        </section>
      ))}

      <div className="coming-soon-notice card">
        <h3>🚧 În dezvoltare</h3>
        <p>
          Funcționalitatea completă de generare template-uri este în curs de implementare.
          Va include:
        </p>
        <ul>
          <li>✓ Selectare lucrător din listă</li>
          <li>✓ Auto-completare date din sistem</li>
          <li>✓ Export Word (.docx) și PDF</li>
          <li>✓ Previzualizare înainte de descărcare</li>
          <li>✓ Istoric documente generate</li>
        </ul>
      </div>
    </div>
  )
}

export default Templates

