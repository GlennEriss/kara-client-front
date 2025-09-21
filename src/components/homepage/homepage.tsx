'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Menu, X, Heart, Users, Lightbulb, Gift, CalendarCheck, PiggyBank, Cross, HandHeart, MousePointer, Mail, Phone, MapPin, Star, Home, HeartHandshake } from 'lucide-react'
import { IconBrandTiktok, IconBrandFacebook, IconBrandInstagram, IconBrandLinkedin, IconBrandTwitter, IconBrandYoutube } from '@tabler/icons-react'
import { NavbarLogo, FooterLogo } from '@/components/logo'
import './homepage.css'
import { useHomepage } from '@/hooks/homepage/useHomepage'
import { TruncatedText } from './TruncatedText'

const Homepage = () => {
  // Utilisation du hook de logique métier
  const { state, actions } = useHomepage()
  const { isMenuOpen, isScrolled, expandedTexts, user } = state
  const { toggleMenu, scrollToSection, toggleText, handleRegister } = actions

  return (
    <div className="h-screen bg-white font-montserrat">
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${isScrolled ? 'py-3 navbar-scrolled' : 'py-4'}`}>
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex justify-between items-center">
            <NavbarLogo
              size="lg"
              isScrolled={isScrolled}
              clickable
              onClick={() => scrollToSection('accueil')}
              priority
            />

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              {['accueil', 'qui-sommes-nous', 'objectifs', 'services', 'adhesion', 'contact'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item)}
                  className={`relative font-medium transition-all duration-300 capitalize group ${isScrolled ? 'text-kara-blue' : 'text-white'
                    } hover:text-kara-gold`}
                >
                  {item.replace('-', ' ')}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-kara-gold transition-all duration-300 group-hover:w-full"></span>
                </button>
              ))}
              <Button
                variant={isScrolled ? 'outline' : 'default'}
                className={`ml-4 px-6 py-2 rounded-full font-semibold transition-all duration-300 ${isScrolled
                    ? 'text-kara-blue border-2 border-kara-blue hover:bg-kara-blue hover:text-white hover:scale-105'
                    : 'bg-kara-blue text-white hover:bg-kara-gold hover:text-white hover:scale-105 border-none'
                  }`}
                onClick={() => actions.handleRegister()}
              >
                {user ? 'Mon espace' : 'Se connecter'}
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden p-2 rounded-lg transition-all duration-300 hover:bg-white/10"
              onClick={toggleMenu}
            >
              {isMenuOpen ? (
                <X size={24} className={isScrolled ? 'text-kara-blue' : 'text-white'} />
              ) : (
                <Menu size={24} className={isScrolled ? 'text-kara-blue' : 'text-white'} />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden mobile-menu mt-6 rounded-xl mx-4 animate-fade-in-up">
              <div className="py-6 px-6 space-y-4">
                {['accueil', 'qui-sommes-nous', 'objectifs', 'services', 'adhesion', 'contact'].map((item) => (
                  <button
                    key={item}
                    onClick={() => scrollToSection(item)}
                    className="block text-kara-blue hover:text-kara-gold transition-all duration-300 capitalize w-full text-left py-2 px-2 rounded-lg hover:bg-kara-blue/5 font-medium"
                  >
                    {item.replace('-', ' ')}
                  </button>
                ))}
                <div className="pt-4 border-t border-kara-blue/10">
                  <Button
                    variant="outline"
                    className="w-full text-kara-blue border-kara-blue hover:bg-kara-blue hover:text-white transition-all duration-300 rounded-full py-3 font-semibold"
                    onClick={() => actions.handleRegister()}
                  >
                    Se connecter
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="accueil" className="hero-section md:px-5 min-h-screen flex items-center relative overflow-hidden">
        <div className="container mx-auto px-4 lg:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 xl:gap-16 items-center">
            <div className="text-white space-y-8 animate-fade-in-left">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.1]">
                  <span className="block mt-10">KARA</span>
                  <span className="block text-kara-gold bg-gradient-to-r from-kara-gold to-yellow-400 bg-clip-text text-transparent">
                    Mutuelle de Solidarité
                  </span>
                </h1>
                <div className="w-24 h-1 bg-gradient-to-r from-kara-gold to-transparent rounded-full"></div>
              </div>

              <p className="text-lg sm:text-xl lg:text-2xl font-light leading-relaxed opacity-95 max-w-lg">
                Une famille élargie et inclusive, un réseau de cœurs ouverts qui refusent l'indifférence et choisissent la main tendue.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  className="btn-primary px-8 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 group"
                  onClick={() => scrollToSection('adhesion')}
                >
                  <Heart className="mr-2 group-hover:scale-110 transition-transform duration-300" size={20} />
                  Nous Rejoindre
                </Button>
                <Button
                  variant="outline"
                  className="btn-secondary px-8 py-4 rounded-full font-semibold text-lg border-2 border-white/30 text-white hover:bg-white hover:text-kara-blue transition-all duration-300 group"
                  onClick={() => scrollToSection('qui-sommes-nous')}
                >
                  <Users className="mr-2 group-hover:scale-110 transition-transform duration-300" size={20} />
                  En Savoir Plus
                </Button>
              </div>
            </div>

            <div className="animate-fade-in-right lg:justify-self-end">
              <div className="relative max-w-lg mx-auto">
                <div className="hero-card w-full h-80 sm:h-96 lg:h-[28rem] rounded-3xl overflow-hidden floating shadow-2xl">
                  <img
                    src="/imgkara.webp"
                    alt="KARA - Solidarité Active"
                    className="hero-image-full w-full h-full object-cover"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-kara-blue/20 to-transparent"></div>
                </div>
                <div className="hero-badge absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-kara-gold to-yellow-400 rounded-full flex items-center justify-center animate-bounce-in shadow-xl">
                  <Star className="text-white animate-pulse" size={24} />
                </div>

                {/* Decorative elements */}
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-kara-gold/20 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Background decorative elements */}
        <div className="absolute top-1/4 right-10 w-2 h-2 bg-kara-gold rounded-full animate-ping opacity-60"></div>
        <div className="absolute bottom-1/3 left-10 w-1 h-1 bg-white rounded-full animate-ping opacity-40"></div>
        <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-kara-gold rounded-full animate-pulse opacity-50"></div>
      </section>

      {/* Qui sommes-nous Section */}
      <section id="qui-sommes-nous" className="py-16 md:px-5 lg:py-24 bg-gradient-to-br from-gray-50 to-white relative">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-16 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-kara-blue/10 rounded-2xl mb-6">
              <Users className="w-8 h-8 text-kara-blue" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-kara-blue mb-6">
              Qui sommes-nous?
            </h2>
            <div className="section-divider mx-auto mb-4"></div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Découvrez l'histoire et les valeurs qui animent notre mutuelle
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-stretch max-w-6xl mx-auto">
            <Card className="card-hover animate-slide-in-left h-full group">
              <CardContent className="p-8 lg:p-10 flex flex-col h-full text-center">
                <div className="relative mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-kara-gold/20 to-kara-gold/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Home size={40} className="text-kara-gold" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-kara-gold/20 rounded-full animate-pulse"></div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-kara-blue mb-6">Notre origine</h3>
                  <TruncatedText
                    id="qui-sommes-nous-1"
                    fullText="Née du désir profond des jeunes d'Awoungou de créer un espace d'entraide, de partage et de solidarité, la mutuelle KARA est une association gabonaise à but non lucratif s'inscrivant dans une démarche purement sociale."
                    truncatedText="Née du désir profond des jeunes d'Awoungou de créer un espace d'entraide, de partage et de solidarité"
                    className="text-gray-700 leading-relaxed"
                    expandedTexts={expandedTexts}
                    onToggle={toggleText}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover animate-slide-in-right h-full group">
              <CardContent className="p-8 lg:p-10 flex flex-col h-full text-center">
                <div className="relative mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-kara-blue/20 to-kara-blue/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    <HeartHandshake size={40} className="text-kara-blue" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-kara-blue/20 rounded-full animate-pulse"></div>
                </div>
                <div className="flex-grow flex flex-col justify-center">
                  <h3 className="text-xl font-bold text-kara-blue mb-6">Notre vision</h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    Kara c'est d'abord une famille élargie et inclusive, un réseau de cœurs ouverts qui refusent l'indifférence et choisissent la main tendue.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-10 right-10 w-20 h-20 bg-kara-gold/5 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 left-10 w-32 h-32 bg-kara-blue/5 rounded-full blur-2xl"></div>
      </section>

      {/* Objectifs Section */}
      <section id="objectifs" className="py-20 md:px-5 bg-white">
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
                expandedTexts={expandedTexts}
                onToggle={toggleText}
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
                  expandedTexts={expandedTexts}
                  onToggle={toggleText}
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
                  expandedTexts={expandedTexts}
                  onToggle={toggleText}
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
      <section id="adhesion" className="py-20 md:px-5 bg-white">
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
                    expandedTexts={expandedTexts}
                    onToggle={toggleText}
                  />
                  <Button onClick={handleRegister} className="btn-secondary px-12 py-4 rounded-full font-bold text-lg mb-6">
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
            <Card className="contact-card animate-scale-in">
              <CardContent>
                <div className="text-center">
                  <Mail className="text-kara-blue mx-auto mb-6" size={80} />
                  <h3 className="text-2xl font-bold text-kara-blue mb-6">Contactez-nous</h3>
                  <div className="flex justify-center">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Mail className="text-kara-gold" size={20} />
                        <span className="text-lg">contact@kara-mutuelle.ga</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Phone className="text-kara-gold" size={20} />
                        <span className="text-lg">+241 XX XX XX XX</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <MapPin className="text-kara-gold" size={20} />
                        <span className="text-lg">Awoungou, Gabon</span>
                      </div>
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
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="text-center">
              <FooterLogo
                size="lg"
                className="mb-4 mx-auto"
                clickable
                onClick={() => scrollToSection('accueil')}
              />
              <p className="text-gray-300 leading-relaxed">
                Une mutuelle gabonaise à but non lucratif dédiée à la solidarité active et à l'entraide communautaire.
              </p>
            </div>

            <div className="text-center">
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
          </div>

          <div className="text-center">
            <h4 className="text-xl font-semibold mb-4">Suivez-nous</h4>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => window.open(process.env.NEXT_PUBLIC_FACEBOOK_URL, '_blank')}
                className="text-gray-300 hover:text-kara-gold transition-colors">
                <IconBrandFacebook size={24} />
              </button>
              <button
                onClick={() => window.open(process.env.NEXT_PUBLIC_TWITTER_URL, '_blank')}
                className="text-gray-300 hover:text-kara-gold transition-colors">
                <IconBrandTwitter size={24} />
              </button>
              <button
                onClick={() => window.open(process.env.NEXT_PUBLIC_INSTAGRAM_URL, '_blank')}
                className="text-gray-300 hover:text-kara-gold transition-colors">
                <IconBrandInstagram size={24} />
              </button>
              <button
                onClick={() => window.open(process.env.NEXT_PUBLIC_LINKEDIN_URL, '_blank')}
                className="text-gray-300 hover:text-kara-gold transition-colors">
                <IconBrandLinkedin size={24} />
              </button>
              <button
                onClick={() => window.open(process.env.NEXT_PUBLIC_YOUTUBE_URL, '_blank')}
                className="text-gray-300 hover:text-kara-gold transition-colors">
                <IconBrandYoutube size={24} />
              </button>
              <button
                onClick={() => window.open(process.env.NEXT_PUBLIC_TIKTOK_URL, '_blank')}
                className="text-gray-300 hover:text-kara-gold transition-colors">
                <IconBrandTiktok size={24} />
              </button>
            </div>
          </div>

          <div className="border-t border-gray-600 mt-8 pt-8 text-center">
            <p className="text-gray-300">© 2025 KARA - Mutuelle de Solidarité. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Homepage