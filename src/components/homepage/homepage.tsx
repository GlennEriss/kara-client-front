'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Menu, X, Heart, Users, Lightbulb, Gift, CalendarCheck, PiggyBank, Cross, HandHeart, MousePointer, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Star, Home, HeartHandshake, ChevronDown, ChevronUp } from 'lucide-react'
import './homepage.css'

const Homepage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [expandedTexts, setExpandedTexts] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setIsMenuOpen(false)
    }
  }

  const toggleText = (textId: string) => {
    setExpandedTexts(prev => ({
      ...prev,
      [textId]: !prev[textId]
    }))
  }

  const TruncatedText = ({ 
    id, 
    fullText, 
    truncatedText, 
    className = "text-lg leading-relaxed text-gray-700" 
  }: {
    id: string
    fullText: string
    truncatedText: string
    className?: string
  }) => {
    const isExpanded = expandedTexts[id]
    
    return (
      <div>
        <p className={className}>
          {isExpanded ? fullText : truncatedText}
        </p>
        <button
          onClick={() => toggleText(id)}
          className="md:hidden mt-2 text-kara-blue hover:text-kara-gold transition-colors text-sm font-medium flex items-center"
        >
          {isExpanded ? (
            <>
              Voir moins <ChevronUp size={16} className="ml-1" />
            </>
          ) : (
            <>
              Voir plus <ChevronDown size={16} className="ml-1" />
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-montserrat">
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 py-4 ${
        isScrolled ? 'navbar-scrolled' : ''
      }`}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="cursor-pointer">
              <img 
                src="/Logo-Kara.webp" 
                alt="KARA Logo" 
                className="logo-kara"
              />
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-8">
              {['accueil', 'qui-sommes-nous', 'objectifs', 'services', 'adhesion', 'contact'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item)}
                  className="text-white hover:text-kara-gold transition-colors duration-300 capitalize"
                >
                  {item.replace('-', ' ')}
                </button>
              ))}
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden mobile-menu mt-4 rounded-lg mx-4">
              <div className="py-4 px-6 space-y-4">
                {['accueil', 'qui-sommes-nous', 'objectifs', 'services', 'adhesion', 'contact'].map((item) => (
                  <button
                    key={item}
                    onClick={() => scrollToSection(item)}
                    className="block text-kara-blue hover:text-kara-gold transition-colors capitalize w-full text-left"
                  >
                    {item.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="accueil" className="hero-section min-h-screen flex items-center">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
                          <div className="text-white space-y-6 animate-fade-in-left">
                <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
                  KARA
                  <span className="block text-kara-gold">Mutuelle de Solidarité</span>
                </h1>
                <TruncatedText
                  id="hero-description"
                  fullText="Une famille élargie et inclusive, un réseau de cœurs ouverts qui refusent l'indifférence et choisissent la main tendue."
                  truncatedText="Une famille élargie et inclusive, un réseau de cœurs ouverts..."
                  className="text-xl font-light leading-relaxed opacity-90"
                />
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  className="btn-primary px-8 py-4 rounded-full font-semibold text-lg"
                  onClick={() => scrollToSection('adhesion')}
                >
                  <Heart className="mr-2" size={20} />
                  Nous Rejoindre
                </Button>
                <Button 
                  variant="outline"
                  className="btn-secondary px-8 py-4 rounded-full font-semibold text-lg"
                  onClick={() => scrollToSection('qui-sommes-nous')}
                >
                  <Users className="mr-2" size={20} />
                  En Savoir Plus
                </Button>
              </div>
            </div>
            
            <div className="animate-fade-in-right">
              <div className="relative">
                <div className="hero-card w-full h-96 rounded-3xl overflow-hidden floating">
                  <img 
                    src="/imgkara.webp" 
                    alt="KARA - Solidarité Active" 
                    className="hero-image-full w-full h-full object-cover"
                  />
                </div>
                <div className="hero-badge absolute -top-6 -right-6 w-24 h-24 bg-kara-gold rounded-full flex items-center justify-center animate-bounce-in">
                  <Star className="text-white" size={32} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Qui sommes-nous Section */}
      <section id="qui-sommes-nous" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl font-bold text-kara-blue mb-4">Qui sommes-nous?</h2>
            <div className="section-divider mx-auto"></div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Card className="card-hover animate-slide-in-left">
              <CardContent className="p-8">
                <div className="text-6xl text-kara-gold mb-6 text-center">
                  <Home size={80} />
                </div>
                                 <TruncatedText
                   id="qui-sommes-nous-1"
                   fullText="Née du désir profond des jeunes d'Awoungou de créer un espace d'entraide, de partage et de solidarité, la mutuelle KARA est une association gabonaise à but non lucratif s'inscrivant dans une démarche purement sociale."
                   truncatedText="Née du désir profond des jeunes d'Awoungou de créer un espace d'entraide, de partage et de solidarité..."
                 />
              </CardContent>
            </Card>
            
            <Card className="card-hover animate-slide-in-right">
              <CardContent className="p-8">
                <div className="text-6xl text-kara-blue mb-6 text-center">
                  <HeartHandshake size={80} />
                </div>
                                 <p className="text-lg leading-relaxed text-gray-700">
                   Kara c'est d'abord une famille élargie et inclusive, un réseau de cœurs ouverts qui refusent l'indifférence et choisissent la main tendue.
                 </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Objectifs Section */}
      <section id="objectifs" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl font-bold text-kara-blue mb-4">Nos Objectifs</h2>
            <div className="section-divider mx-auto"></div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center animate-scale-in objective-card">
              <div className="objective-icon bg-gradient-to-br from-kara-blue to-kara-blue/80 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Users className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-kara-blue mb-4">Solidarité Active</h3>
                             <TruncatedText
                 id="objectifs-1"
                 fullText="Encourager la solidarité active entre les membres en mettant tout en œuvre pour accompagner humainement, financièrement et matériellement chacun des membres dans ses événements heureux comme malheureux."
                 truncatedText="Encourager la solidarité active entre les membres en mettant tout en œuvre pour accompagner humainement, financièrement et matériellement..."
                 className="text-gray-700 leading-relaxed"
               />
            </div>
            
            <div className="text-center animate-scale-in objective-card" style={{ animationDelay: '0.2s' }}>
              <div className="objective-icon bg-gradient-to-br from-kara-gold to-kara-gold/80 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-kara-blue mb-4">Initiatives Jeunesse</h3>
                             <p className="text-gray-700 leading-relaxed">
                 Servir de point d'ancrage à la réalisation des initiatives portées par la jeunesse.
               </p>
            </div>
            
            <div className="text-center animate-scale-in objective-card" style={{ animationDelay: '0.4s' }}>
              <div className="objective-icon bg-gradient-to-br from-kara-blue to-kara-gold rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Gift className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-kara-blue mb-4">Actions Caritatives</h3>
                             <p className="text-gray-700 leading-relaxed">
                 Nous croyons que chaque membre a quelque chose à donner, c'est pourquoi la mutuelle KARA s'ouvre au monde par les actions charitables auprès des nécessiteux.
               </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl font-bold text-kara-blue mb-4">Quels services proposons-nous?</h2>
            <div className="section-divider mx-auto"></div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="service-card animate-fade-in-up">
              <CardContent className="p-8 text-center">
                <CalendarCheck className="text-kara-blue mx-auto mb-6" size={64} />
                <h3 className="text-xl font-bold text-kara-blue mb-4">L'entraide mensuelle</h3>
                                 <p className="text-gray-700 text-sm leading-relaxed">
                   Comme toute association, Kara vit des cotisations mensuelles de ses membres et du soutien des bénévoles. À travers l'entraide mensuelle, chacun participe activement au fonctionnement régulier de notre mutuelle.
                 </p>
              </CardContent>
            </Card>
            
            <Card className="service-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <CardContent className="p-8 text-center">
                <PiggyBank className="text-kara-gold mx-auto mb-6" size={64} />
                <h3 className="text-xl font-bold text-kara-blue mb-4">La Caisse spéciale</h3>
                                 <TruncatedText
                   id="service-caisse-speciale"
                   fullText="La Caisse spéciale est un fond volontaire destiné à encourager l'épargne volontaire et l'autonomie de chaque membre. En contrepartie des versements mensuels, la mutuelle KARA assure la conservation et la mise à disposition de ces fonds aux épargnants en cas de besoin."
                   truncatedText="La Caisse spéciale est un fond volontaire destiné à encourager l'épargne volontaire et l'autonomie de chaque membre..."
                   className="text-gray-700 text-sm leading-relaxed"
                 />
              </CardContent>
            </Card>
            
            <Card className="service-card animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <CardContent className="p-8 text-center">
                <Cross className="text-kara-blue mx-auto mb-6" size={64} />
                <h3 className="text-xl font-bold text-kara-blue mb-4">La caisse imprévue</h3>
                                 <p className="text-gray-700 text-sm leading-relaxed">
                   Comme son nom l'indique cette caisse répond au besoin d'alléger les urgences imprévues. Les membres y ont droit sous forme d'accompagnement.
                 </p>
              </CardContent>
            </Card>
            
            <Card className="service-card animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <CardContent className="p-8 text-center">
                <HandHeart className="text-kara-gold mx-auto mb-6" size={64} />
                <h3 className="text-xl font-bold text-kara-blue mb-4">La caisse bienfaiteur</h3>
                                 <TruncatedText
                   id="service-bienfaiteur"
                   fullText="Parce que la générosité n'a pas de frontières, KARA offre la possibilité à une catégorie de membres dits «bienfaiteur» de contribuer exceptionnellement aux œuvres caritatives qu'elle organise."
                   truncatedText="Parce que la générosité n'a pas de frontières, KARA offre la possibilité à une catégorie de membres dits «bienfaiteur»..."
                   className="text-gray-700 text-sm leading-relaxed"
                 />
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center mt-12">
            <h3 className="text-2xl font-bold text-gradient">Avec KARA, la solidarité est une force !</h3>
          </div>
        </div>
      </section>

      {/* Adhésion Section */}
      <section id="adhesion" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in-up">
              <h2 className="text-4xl font-bold text-kara-blue mb-8">Comment adhérer à KARA ?</h2>
              <div className="section-divider mx-auto mb-12"></div>
              
              <Card className="adhesion-card p-12 text-white">
                <CardContent>
                  <MousePointer className="text-kara-gold mx-auto mb-8" size={80} />
                                     <TruncatedText
                     id="adhesion"
                     fullText="En un clic, vous pouvez choisir dès maintenant de rejoindre notre chaîne de solidarité et découvrir notre règlement intérieur. En adhérant à KARA, vous faîtes le choix d'impacter positivement le monde de votre façon et de semer une graine d'amour dans un cœur."
                     truncatedText="En un clic, vous pouvez choisir dès maintenant de rejoindre notre chaîne de solidarité et découvrir notre règlement intérieur..."
                     className="text-xl leading-relaxed mb-8"
                   />
                  <Button className="btn-secondary px-12 py-4 rounded-full font-bold text-lg mb-6">
                    <Users className="mr-3" size={20} />
                    Adhérer Maintenant
                  </Button>
                  <p className="text-2xl font-bold text-kara-gold">
                    Avec KARA, aimer n'a jamais été aussi simple !
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl font-bold text-kara-blue mb-4">Nous Contacter</h2>
            <div className="section-divider mx-auto mb-8"></div>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Pour obtenir des informations supplémentaires et discuter amplement avec les représentants de la mutuelle KARA, contactez le secrétaire général.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <Card className="contact-card p-12 animate-scale-in">
              <CardContent>
                <div className="text-center">
                  <Mail className="text-kara-blue mx-auto mb-6" size={80} />
                  <h3 className="text-2xl font-bold text-kara-blue mb-6">Contactez-nous</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-3">
                      <Mail className="text-kara-gold" size={20} />
                      <span className="text-lg">contact@kara-mutuelle.ga</span>
                    </div>
                    <div className="flex items-center justify-center space-x-3">
                      <Phone className="text-kara-gold" size={20} />
                      <span className="text-lg">+241 XX XX XX XX</span>
                    </div>
                    <div className="flex items-center justify-center space-x-3">
                      <MapPin className="text-kara-gold" size={20} />
                      <span className="text-lg">Awoungou, Gabon</span>
                    </div>
                  </div>
                  <Button className="btn-primary px-8 py-3 rounded-full font-semibold mt-8">
                    <Mail className="mr-2" size={16} />
                    Nous Écrire
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-section text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <img 
                src="/Logo-Kara.webp" 
                alt="KARA Logo" 
                className="footer-logo mb-4"
              />
              <p className="text-gray-300 leading-relaxed">
                Une mutuelle gabonaise à but non lucratif dédiée à la solidarité active et à l'entraide communautaire.
              </p>
            </div>
            
            <div>
              <h4 className="text-xl font-semibold mb-4">Liens Rapides</h4>
              <ul className="space-y-2">
                {[
                  { id: 'qui-sommes-nous', label: 'Qui sommes-nous' },
                  { id: 'objectifs', label: 'Nos objectifs' },
                  { id: 'services', label: 'Services' },
                  { id: 'adhesion', label: 'Adhésion' }
                ].map((link) => (
                  <li key={link.id}>
                    <button 
                      onClick={() => scrollToSection(link.id)}
                      className="text-gray-300 hover:text-kara-gold transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-xl font-semibold mb-4">Suivez-nous</h4>
              <div className="flex space-x-4">
                <button className="text-gray-300 hover:text-kara-gold transition-colors">
                  <Facebook size={24} />
                </button>
                <button className="text-gray-300 hover:text-kara-gold transition-colors">
                  <Twitter size={24} />
                </button>
                <button className="text-gray-300 hover:text-kara-gold transition-colors">
                  <Instagram size={24} />
                </button>
                <button className="text-gray-300 hover:text-kara-gold transition-colors">
                  <Linkedin size={24} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-600 mt-8 pt-8 text-center">
            <p className="text-gray-300">© 2024 KARA - Mutuelle de Solidarité. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Homepage