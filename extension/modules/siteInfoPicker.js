import { showError, showSuccess, showInfo, showModal } from './helpers.js';

// Detect technologies and frameworks
function detectTechnologies() {
  const technologies = {
    // Frontend Frameworks
    react: {
      name: 'React',
      detected: !!document.querySelector('[data-reactroot]') || 
                !!window.React || 
                !!document.querySelector('script[src*="react"]') ||
                !!document.querySelector('script[src*="react-dom"]') ||
                !!document.querySelector('div[id*="react"]') ||
                !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
      confidence: 'high'
    },
    nextjs: {
      name: 'Next.js',
      detected: !!document.querySelector('script[id="__NEXT_DATA__"]') ||
                !!window.__NEXT_DATA__ ||
                !!document.querySelector('meta[name="next-head-count"]') ||
                !!document.querySelector('script[src*="next"]') ||
                !!document.querySelector('link[rel="preload"][as="script"][href*="_next"]'),
      confidence: 'high'
    },
    nuxt: {
      name: 'Nuxt.js',
      detected: !!window.$nuxt ||
                !!document.querySelector('script[id="__NUXT__"]') ||
                !!document.querySelector('meta[name="nuxt-app"]'),
      confidence: 'high'
    },
    vue: {
      name: 'Vue.js',
      detected: !!window.Vue || 
                !!document.querySelector('[data-v-]') ||
                !!document.querySelector('script[src*="vue"]'),
      confidence: 'high'
    },
    angular: {
      name: 'Angular',
      detected: !!window.ng || 
                !!document.querySelector('[ng-app]') ||
                !!document.querySelector('script[src*="angular"]'),
      confidence: 'high'
    },
    svelte: {
      name: 'Svelte',
      detected: !!document.querySelector('script[src*="svelte"]') ||
                !!window.svelte,
      confidence: 'medium'
    },
    
    // Backend/CMS
    wordpress: {
      name: 'WordPress',
      detected: !!document.querySelector('meta[name="generator"][content*="WordPress"]') ||
                !!document.querySelector('link[href*="wp-content"]') ||
                !!document.querySelector('script[src*="wp-includes"]') ||
                !!window.wp,
      confidence: 'high'
    },
    drupal: {
      name: 'Drupal',
      detected: !!document.querySelector('meta[name="generator"][content*="Drupal"]') ||
                !!document.querySelector('link[href*="sites/default"]'),
      confidence: 'high'
    },
    joomla: {
      name: 'Joomla',
      detected: !!document.querySelector('meta[name="generator"][content*="Joomla"]') ||
                !!document.querySelector('link[href*="templates"]'),
      confidence: 'high'
    },
    
    // E-commerce
    shopify: {
      name: 'Shopify',
      detected: !!document.querySelector('script[src*="shopify"]') ||
                !!window.Shopify ||
                !!document.querySelector('link[href*="shopify"]') ||
                !!document.querySelector('meta[name="shopify-digital-wallet"]') ||
                !!document.querySelector('script[src*="cdn.shopify.com"]') ||
                !!window.ShopifyAnalytics ||
                !!document.querySelector('[data-shopify]'),
      confidence: 'high'
    },
    woocommerce: {
      name: 'WooCommerce',
      detected: !!document.querySelector('script[src*="woocommerce"]') ||
                !!document.querySelector('link[href*="woocommerce"]'),
      confidence: 'medium'
    },
    magento: {
      name: 'Magento',
      detected: !!document.querySelector('script[src*="magento"]') ||
                !!document.querySelector('link[href*="magento"]'),
      confidence: 'medium'
    },
    
    // Analytics & Tracking
    googleAnalytics: {
      name: 'Google Analytics',
      detected: !!document.querySelector('script[src*="google-analytics"]') ||
                !!document.querySelector('script[src*="gtag"]') ||
                !!window.ga || !!window.gtag,
      confidence: 'high'
    },
    googleTagManager: {
      name: 'Google Tag Manager',
      detected: !!document.querySelector('script[src*="googletagmanager"]') ||
                !!window.google_tag_manager,
      confidence: 'high'
    },
    facebookPixel: {
      name: 'Facebook Pixel',
      detected: !!document.querySelector('script[src*="facebook.net"]') ||
                !!window.fbq,
      confidence: 'high'
    },
    
    // CDN & Hosting
    cloudflare: {
      name: 'Cloudflare',
      detected: !!document.querySelector('meta[name="cf-ray"]') ||
                !!document.querySelector('script[src*="cloudflare"]'),
      confidence: 'high'
    },
    aws: {
      name: 'AWS',
      detected: !!document.querySelector('script[src*="amazonaws"]') ||
                !!document.querySelector('link[href*="amazonaws"]'),
      confidence: 'medium'
    },
    
    // UI Libraries
    bootstrap: {
      name: 'Bootstrap',
      detected: !!document.querySelector('link[href*="bootstrap"]') ||
                !!document.querySelector('script[src*="bootstrap"]'),
      confidence: 'high'
    },
    tailwind: {
      name: 'Tailwind CSS',
      detected: !!document.querySelector('script[src*="tailwind"]') ||
                document.documentElement.classList.contains('tailwind'),
      confidence: 'medium'
    },
    jquery: {
      name: 'jQuery',
      detected: !!window.jQuery || !!window.$,
      confidence: 'high'
    },
    
    // Build Tools
    webpack: {
      name: 'Webpack',
      detected: !!document.querySelector('script[src*="webpack"]') ||
                !!window.webpackChunkName,
      confidence: 'medium'
    },
    vite: {
      name: 'Vite',
      detected: !!document.querySelector('script[src*="vite"]') ||
                !!window.__vite_plugin_react_preamble_installed__,
      confidence: 'medium'
    },
    
    // Payment Systems
    stripe: {
      name: 'Stripe',
      detected: !!document.querySelector('script[src*="stripe"]') ||
                !!window.Stripe,
      confidence: 'high'
    },
    paypal: {
      name: 'PayPal',
      detected: !!document.querySelector('script[src*="paypal"]') ||
                !!window.paypal,
      confidence: 'high'
    }
  };
  
  return Object.entries(technologies)
    .filter(([, tech]) => tech.detected)
    .map(([key, tech]) => ({ key, ...tech }));
}

// Get page performance metrics
function getPerformanceMetrics() {
  const navigation = performance.getEntriesByType('navigation')[0];
  const paint = performance.getEntriesByType('paint');
  
  return {
    loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.loadEventStart) : 'N/A',
    domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart) : 'N/A',
    firstPaint: paint.find(p => p.name === 'first-paint')?.startTime ? 
                Math.round(paint.find(p => p.name === 'first-paint').startTime) : 'N/A',
    firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime ?
                         Math.round(paint.find(p => p.name === 'first-contentful-paint').startTime) : 'N/A',
    transferSize: navigation ? Math.round(navigation.transferSize / 1024) : 'N/A',
    encodedBodySize: navigation ? Math.round(navigation.encodedBodySize / 1024) : 'N/A'
  };
}

// Get security information
function getSecurityInfo() {
  const security = {
    https: location.protocol === 'https:',
    hasCSP: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
    hasHSTS: document.cookie.includes('HSTS') || 
             document.querySelector('meta[http-equiv="Strict-Transport-Security"]'),
    hasReferrerPolicy: !!document.querySelector('meta[name="referrer"]'),
    hasPermissionsPolicy: !!document.querySelector('meta[http-equiv="Permissions-Policy"]')
  };
  
  return security;
}

// Get SEO information
function getSEOInfo() {
  const seo = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || 'Not set',
    keywords: document.querySelector('meta[name="keywords"]')?.content || 'Not set',
    canonical: document.querySelector('link[rel="canonical"]')?.href || 'Not set',
    robots: document.querySelector('meta[name="robots"]')?.content || 'Not set',
    ogTitle: document.querySelector('meta[property="og:title"]')?.content || 'Not set',
    ogDescription: document.querySelector('meta[property="og:description"]')?.content || 'Not set',
    ogImage: document.querySelector('meta[property="og:image"]')?.content || 'Not set',
    twitterCard: document.querySelector('meta[name="twitter:card"]')?.content || 'Not set',
    hasSchema: !!document.querySelector('script[type="application/ld+json"]'),
    h1Count: document.querySelectorAll('h1').length,
    h2Count: document.querySelectorAll('h2').length,
    imageCount: document.querySelectorAll('img').length,
    linkCount: document.querySelectorAll('a').length
  };
  
  return seo;
}

// Get accessibility information
function getAccessibilityInfo() {
  const a11y = {
    hasLang: !!document.documentElement.lang,
    hasSkipLinks: !!document.querySelector('a[href="#main"], a[href="#content"]'),
    hasAltText: Array.from(document.querySelectorAll('img')).every(img => img.alt !== undefined),
    hasFormLabels: Array.from(document.querySelectorAll('input')).every(input => 
      input.labels.length > 0 || input.getAttribute('aria-label') || input.getAttribute('placeholder')
    ),
    hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
    hasLandmarks: document.querySelectorAll('main, nav, aside, section, article, header, footer').length > 0,
    colorContrast: 'Check manually', // Would need more complex analysis
    focusManagement: 'Check manually'
  };
  
  return a11y;
}

// Get social media presence
function getSocialMediaInfo() {
  const social = {
    facebook: !!document.querySelector('meta[property="og:site_name"]') ||
             !!document.querySelector('script[src*="facebook"]'),
    twitter: !!document.querySelector('meta[name="twitter:site"]') ||
            !!document.querySelector('script[src*="twitter"]'),
    linkedin: !!document.querySelector('meta[property="og:type"][content="article"]') ||
              !!document.querySelector('script[src*="linkedin"]'),
    instagram: !!document.querySelector('meta[property="og:site_name"][content*="Instagram"]'),
    youtube: !!document.querySelector('script[src*="youtube"]') ||
             !!document.querySelector('iframe[src*="youtube"]'),
    tiktok: !!document.querySelector('script[src*="tiktok"]')
  };
  
  return social;
}

// Analyze site structure
function analyzeSiteStructure() {
  const structure = {
    hasHeader: !!document.querySelector('header, .header, #header'),
    hasFooter: !!document.querySelector('footer, .footer, #footer'),
    hasNavigation: !!document.querySelector('nav, .nav, .navigation'),
    hasSidebar: !!document.querySelector('aside, .sidebar, .side-bar'),
    hasMain: !!document.querySelector('main, .main, #main'),
    hasSearch: !!document.querySelector('input[type="search"], .search, #search'),
    hasLogin: !!document.querySelector('input[type="password"], .login, #login'),
    hasCart: !!document.querySelector('.cart, #cart, [class*="cart"]'),
    hasNewsletter: !!document.querySelector('input[type="email"], .newsletter, #newsletter'),
    pageDepth: window.location.pathname.split('/').length - 1,
    hasBreadcrumbs: !!document.querySelector('.breadcrumb, .breadcrumbs, nav[aria-label="breadcrumb"]')
  };
  
  return structure;
}

// Generate comprehensive site report
async function generateSiteReport() {
  try {
    showInfo('Analyzing website...', 2000);
    
    const url = new URL(window.location.href);
    const technologies = detectTechnologies();
    const performance = getPerformanceMetrics();
    const security = getSecurityInfo();
    const seo = getSEOInfo();
    const accessibility = getAccessibilityInfo();
    const social = getSocialMediaInfo();
    const structure = analyzeSiteStructure();
    
    // Calculate scores
    const techScore = technologies.length;
    const securityScore = Object.values(security).filter(Boolean).length;
    const seoScore = [
      seo.title && seo.title.length > 10,
      seo.description && seo.description.length > 50,
      seo.canonical !== 'Not set',
      seo.ogTitle !== 'Not set',
      seo.hasSchema
    ].filter(Boolean).length;
    
    const accessibilityScore = Object.values(accessibility).filter(val => 
      val === true || val === 'Check manually'
    ).length;
    
    const report = {
      // Basic Info
      basic: {
        url: window.location.href,
        domain: url.hostname,
        title: document.title,
        description: seo.description,
        favicon: document.querySelector('link[rel="icon"]')?.href || 'Not set',
        language: document.documentElement.lang || 'Not set',
        charset: document.characterSet || 'Not set',
        viewport: document.querySelector('meta[name="viewport"]')?.content || 'Not set'
      },
      
      // Technologies
      technologies: technologies.map(tech => ({
        name: tech.name,
        confidence: tech.confidence
      })),
      
      // Performance
      performance: {
        ...performance,
        score: performance.loadTime < 3000 ? 'Good' : performance.loadTime < 5000 ? 'Average' : 'Poor'
      },
      
      // Security
      security: {
        ...security,
        score: securityScore >= 4 ? 'Good' : securityScore >= 2 ? 'Average' : 'Poor'
      },
      
      // SEO
      seo: {
        ...seo,
        score: seoScore >= 4 ? 'Good' : seoScore >= 2 ? 'Average' : 'Poor'
      },
      
      // Accessibility
      accessibility: {
        ...accessibility,
        score: accessibilityScore >= 6 ? 'Good' : accessibilityScore >= 4 ? 'Average' : 'Poor'
      },
      
      // Social Media
      social: Object.entries(social).filter(([, value]) => value).map(([key]) => key),
      
      // Structure
      structure: {
        ...structure,
        type: structure.hasCart ? 'E-commerce' : 
              structure.hasLogin ? 'Web Application' : 
              'Content Website'
      },
      
      // Overall Score
      overallScore: Math.round((techScore + securityScore + seoScore + accessibilityScore) / 4)
    };
    
    // Generate report text
    const reportText = generateReportText(report);
    
    showSuccess('Site analysis completed!');
    showModal('🔍 Site Analysis Report', reportText, '🔍', 'site-info');
    
  } catch (error) {
    console.error('Site analysis error:', error);
    showError('Failed to analyze website. Please try again.');
  }
}

// Generate human-readable report text
function generateReportText(report) {
  const techList = report.technologies.map(t => t.name).join(', ') || 'None detected';
  const socialList = report.social.join(', ') || 'None detected';
  
  return `🌐 WEBSITE ANALYSIS REPORT

📊 BASIC INFORMATION
URL: ${report.basic.url}
Domain: ${report.basic.domain}
Title: ${report.basic.title}
Language: ${report.basic.language}
Charset: ${report.basic.charset}

🔧 TECHNOLOGIES DETECTED (${report.technologies.length})
${techList}

⚡ PERFORMANCE METRICS
Load Time: ${report.performance.loadTime}ms
DOM Ready: ${report.performance.domContentLoaded}ms
First Paint: ${report.performance.firstPaint}ms
Transfer Size: ${report.performance.transferSize}KB
Score: ${report.performance.score}

🔒 SECURITY ANALYSIS
HTTPS: ${report.security.https ? '✅' : '❌'}
CSP: ${report.security.hasCSP ? '✅' : '❌'}
HSTS: ${report.security.hasHSTS ? '✅' : '❌'}
Score: ${report.security.score}

🔍 SEO ANALYSIS
Title: ${report.seo.title.length > 50 ? report.seo.title.substring(0, 50) + '...' : report.seo.title}
Description: ${report.seo.description.length > 100 ? report.seo.description.substring(0, 100) + '...' : report.seo.description}
Canonical: ${report.seo.canonical !== 'Not set' ? '✅' : '❌'}
Open Graph: ${report.seo.ogTitle !== 'Not set' ? '✅' : '❌'}
Schema: ${report.seo.hasSchema ? '✅' : '❌'}
Score: ${report.seo.score}

♿ ACCESSIBILITY
Language: ${report.accessibility.hasLang ? '✅' : '❌'}
Alt Text: ${report.accessibility.hasAltText ? '✅' : '❌'}
Form Labels: ${report.accessibility.hasFormLabels ? '✅' : '❌'}
Headings: ${report.accessibility.hasHeadings ? '✅' : '❌'}
Landmarks: ${report.accessibility.hasLandmarks ? '✅' : '❌'}
Score: ${report.accessibility.score}

📱 SOCIAL MEDIA
Platforms: ${socialList}

🏗️ SITE STRUCTURE
Type: ${report.structure.type}
Has Header: ${report.structure.hasHeader ? '✅' : '❌'}
Has Footer: ${report.structure.hasFooter ? '✅' : '❌'}
Has Navigation: ${report.structure.hasNavigation ? '✅' : '❌'}
Has Search: ${report.structure.hasSearch ? '✅' : '❌'}
Page Depth: ${report.structure.pageDepth}

📈 OVERALL SCORE: ${report.overallScore}/10

${report.overallScore >= 8 ? '🌟 Excellent website!' : 
  report.overallScore >= 6 ? '👍 Good website with room for improvement' : 
  report.overallScore >= 4 ? '⚠️ Average website, needs optimization' : 
  '❌ Website needs significant improvements'}`;
}

export function activate(deactivate) {
  
  try {
    // Generate and show site report
    generateSiteReport();
    
  } catch (error) {
    console.error('Site info picker activation error:', error);
    showError('Failed to activate site info tool. Please try again.');
    deactivate();
  }
}

export function deactivate() {
  // Site info tool doesn't need cleanup
  showInfo('Site analysis completed');
}