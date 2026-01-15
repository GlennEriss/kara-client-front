/**
 * Tests E2E pour le module d'inscription (Registration)
 * 
 * Ces tests sont basés sur la structure réelle des composants :
 * - IdentityStepV2
 * - AddressStepV2
 * - CompanyStepV2
 * - DocumentsStepV2
 * 
 * @see https://playwright.dev/
 */

import { test, expect } from '@playwright/test';

// ==================== CONFIGURATION ====================

const TEST_DATA = {
  identity: {
    civility: 'Monsieur',
    lastName: 'Doe',
    firstName: 'John',
    birthDate: { day: '15', month: '03', year: '1990' },
    birthPlace: 'Libreville',
    birthCertificateNumber: '123456',
    prayerPlace: 'Église',
    religion: 'Christianisme',
    phone: '65671734', // 8 chiffres sans +241
    gender: 'Homme',
    nationality: 'Gabonaise',
    maritalStatus: 'Célibataire',
    intermediaryCode: '0000.MK.00001',
  },
  address: {
    province: 'Estuaire',
    commune: 'Libreville Centre',
    district: 'Centre-Ville',
    quarter: 'Dakar',
    street: 'Rue de la Paix',
    postalCode: '24100',
  },
  company: {
    isEmployed: true,
    companyName: 'Test Company',
    profession: 'Ingénieur',
    seniority: '5 ans',
    address: {
      province: 'Estuaire',
      city: 'Libreville Centre',
      district: 'Centre-Ville',
      quarter: 'Dakar',
    },
  },
};

// ==================== HELPERS ====================

/**
 * Navigue vers la page d'inscription
 */
async function goToRegisterPage(page: any) {
  // Ne pas forcer la taille du viewport, utiliser celle du projet Playwright
  // await page.setViewportSize({ width: 1280, height: 720 }); // Retiré pour respecter les tailles d'écran du projet
  await page.goto('/register', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000); // Attendre le chargement du formulaire
}

/**
 * Remplit l'étape 1 (Identité) - Basé sur IdentityStepV2
 */
async function fillIdentityStep(page: any, data = TEST_DATA.identity) {
  // 1. Civilité - Select avec placeholder "Sélectionnez..."
  const civilitySelect = page.locator('label:has-text("Civilité")').locator('..').locator('button[role="combobox"]').first();
  await civilitySelect.waitFor({ state: 'visible', timeout: 5000 });
  await civilitySelect.click();
  await page.waitForTimeout(500);
  await page.locator(`[role="option"]:has-text("${data.civility}")`).first().click();
  await page.waitForTimeout(500);

  // 2. Nom de famille - Input avec name="identity.lastName"
  const lastNameInput = page.locator('input[name="identity.lastName"]');
  await lastNameInput.waitFor({ state: 'visible', timeout: 5000 });
  await lastNameInput.fill(data.lastName);
  await page.waitForTimeout(300);

  // 3. Prénom - Input avec name="identity.firstName" (optionnel)
  const firstNameInput = page.locator('input[name="identity.firstName"]');
  if (data.firstName && data.firstName.trim() !== '') {
    if (await firstNameInput.count() > 0) {
      await firstNameInput.fill(data.firstName);
      await page.waitForTimeout(300);
    }
  }

  // 4. Date de naissance - 3 Select dans un div flex
  // Jour - premier Select dans la section "Date de naissance"
  const birthDateSection = page.locator('label:has-text("Date de naissance")').locator('..');
  const birthDateSelects = birthDateSection.locator('button[role="combobox"]');
  
  // Jour
  await birthDateSelects.nth(0).click();
  await page.waitForTimeout(300);
  await page.locator(`[role="option"]:has-text("${data.birthDate.day}")`).first().click();
  await page.waitForTimeout(300);

  // Mois
  await birthDateSelects.nth(1).click();
  await page.waitForTimeout(300);
  // Chercher le mois par son label (ex: "Mars" pour "03")
  const monthLabels = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const monthIndex = parseInt(data.birthDate.month) - 1;
  await page.locator(`[role="option"]:has-text("${monthLabels[monthIndex]}")`).first().click();
  await page.waitForTimeout(300);

  // Année
  await birthDateSelects.nth(2).click();
  await page.waitForTimeout(300);
  await page.locator(`[role="option"]:has-text("${data.birthDate.year}")`).first().click();
  await page.waitForTimeout(500);

  // 5. Lieu de naissance - Input avec name="identity.birthPlace"
  const birthPlaceInput = page.locator('input[name="identity.birthPlace"]');
  await birthPlaceInput.fill(data.birthPlace);
  await page.waitForTimeout(300);

  // 6. Numéro d'acte de naissance - Input avec name="identity.birthCertificateNumber"
  const birthCertInput = page.locator('input[name="identity.birthCertificateNumber"]');
  await birthCertInput.fill(data.birthCertificateNumber);
  await page.waitForTimeout(300);

  // 7. Nationalité - Select avec label "Nationalité"
  const nationalitySelect = page.locator('label:has-text("Nationalité")').locator('..').locator('button[role="combobox"]').first();
  await nationalitySelect.click();
  await page.waitForTimeout(300);
  await page.locator(`[role="option"]:has-text("${data.nationality}")`).first().click();
  await page.waitForTimeout(300);

  // 8. Genre - Select avec label "Genre"
  const genderSelect = page.locator('label:has-text("Genre")').locator('..').locator('button[role="combobox"]').first();
  await genderSelect.click();
  await page.waitForTimeout(300);
  await page.locator(`[role="option"]:has-text("${data.gender}")`).first().click();
  await page.waitForTimeout(300);

  // 9. Statut marital - Select avec label "Situation matrimoniale"
  const maritalSelect = page.locator('label:has-text("Situation matrimoniale")').locator('..').locator('button[role="combobox"]').first();
  await maritalSelect.click();
  await page.waitForTimeout(300);
  await page.locator(`[role="option"]:has-text("${data.maritalStatus}")`).first().click();
  await page.waitForTimeout(300);

  // 10. Religion - Select avec label "Religion"
  const religionSelect = page.locator('label:has-text("Religion")').locator('..').locator('button[role="combobox"]').first();
  await religionSelect.click();
  await page.waitForTimeout(300);
  await page.locator(`[role="option"]:has-text("${data.religion}")`).first().click();
  await page.waitForTimeout(300);

  // 11. Lieu de prière - Input avec name="identity.prayerPlace"
  const prayerPlaceInput = page.locator('input[name="identity.prayerPlace"]');
  await prayerPlaceInput.fill(data.prayerPlace);
  await page.waitForTimeout(300);

  // 12. Code entremetteur - Input avec name="identity.intermediaryCode"
  // Label: "Qui vous a référé?"
  const intermediaryInput = page.locator('input[name="identity.intermediaryCode"]');
  await intermediaryInput.waitFor({ state: 'visible', timeout: 5000 });
  await intermediaryInput.fill(data.intermediaryCode);
  await page.waitForTimeout(500);
  
  // Vérifier que le code a bien été saisi
  const intermediaryValue = await intermediaryInput.inputValue();
  if (intermediaryValue !== data.intermediaryCode) {
    console.log(`⚠️  Code entremetteur: attendu "${data.intermediaryCode}", obtenu "${intermediaryValue}"`);
    // Réessayer
    await intermediaryInput.fill('');
    await page.waitForTimeout(200);
    await intermediaryInput.fill(data.intermediaryCode);
    await page.waitForTimeout(500);
  } else {
    console.log(`✅ Code entremetteur rempli: "${data.intermediaryCode}"`);
  }

  // 13. Téléphone - Input avec type="tel" dans GabonPhoneInputList
  // Le composant attend 8 chiffres et ajoute automatiquement +241
  const phoneInput = page.locator('input[type="tel"]').first();
  await phoneInput.waitFor({ state: 'visible', timeout: 5000 });
  await phoneInput.click();
  await page.waitForTimeout(200);
  // Saisir les 8 chiffres (sans +241)
  await phoneInput.type(data.phone, { delay: 50 });
  await page.waitForTimeout(1000); // Attendre la validation

  // 14. Email (optionnel)
  if ((data as any).email) {
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.fill((data as any).email);
      await page.waitForTimeout(300);
    }
  }

  // 15. Voiture - Switch
  if ((data as any).hasCar !== undefined) {
    const hasCarSwitch = page.locator('button[role="switch"]').first();
    if (await hasCarSwitch.count() > 0) {
      const isChecked = await hasCarSwitch.getAttribute('aria-checked').catch(() => 'false');
      const shouldBeChecked = (data as any).hasCar === true;
      if (isChecked !== String(shouldBeChecked)) {
        await hasCarSwitch.click();
        await page.waitForTimeout(500);
      }
    }
  }

  // 16. Informations du conjoint (si Marié(e) ou Concubinage)
  if ((data.maritalStatus === 'Marié(e)' || data.maritalStatus === 'Concubinage') && (data as any).spouseLastName) {
    await page.waitForTimeout(1000); // Attendre que la section apparaisse
    
    const spouseLastNameInput = page.locator('input[name="identity.spouseLastName"]');
    if (await spouseLastNameInput.count() > 0) {
      await spouseLastNameInput.waitFor({ state: 'visible', timeout: 5000 });
      await spouseLastNameInput.fill((data as any).spouseLastName);
      await page.waitForTimeout(300);
    }

    if ((data as any).spouseFirstName) {
      const spouseFirstNameInput = page.locator('input[name="identity.spouseFirstName"]');
      if (await spouseFirstNameInput.count() > 0) {
        await spouseFirstNameInput.fill((data as any).spouseFirstName);
        await page.waitForTimeout(300);
      }
    }

    if ((data as any).spousePhone) {
      // Téléphone du conjoint (deuxième input tel)
      const spousePhoneInput = page.locator('input[type="tel"]').nth(1);
      if (await spousePhoneInput.count() > 0) {
        await spousePhoneInput.waitFor({ state: 'visible', timeout: 5000 });
        await spousePhoneInput.click();
        await page.waitForTimeout(200);
        await spousePhoneInput.type((data as any).spousePhone, { delay: 50 });
        await page.waitForTimeout(1000);
      }
    }
  }

  // Attendre que tous les champs soient validés
  await page.waitForTimeout(1000);
}

/**
 * Remplit l'étape 2 (Adresse) - Basé sur AddressStepV2
 * Structure: Province → Commune → District → Quarter
 */
async function fillAddressStep(page: any, data = TEST_DATA.address) {
  await page.waitForTimeout(1500);
  
  // Vérifier qu'on est bien sur l'étape adresse
  await expect(page.locator('text=/Étape 2|Adresse/i').first()).toBeVisible({ timeout: 10000 });
  
  // Les selects sont dans une grille (grid-cols-1 lg:grid-cols-2)
  // On trouve tous les comboboxes dans la section adresse
  // La section contient le texte "Votre adresse de résidence"
  const addressSection = page.locator('text=/Votre adresse de résidence|Sélectionnez votre localisation/i').locator('..').locator('..');
  
  // Trouver tous les comboboxes dans cette section
  const allComboboxes = addressSection.locator('button[role="combobox"]');
  const comboboxCount = await allComboboxes.count();
  console.log(`Nombre de comboboxes trouvés dans la section adresse: ${comboboxCount}`);
  
  if (comboboxCount === 0) {
    // Fallback: chercher tous les comboboxes sur la page et prendre les 4 premiers de l'étape adresse
    const pageComboboxes = page.locator('button[role="combobox"]');
    const pageCount = await pageComboboxes.count();
    console.log(`Nombre total de comboboxes sur la page: ${pageCount}`);
    
    // Les comboboxes de l'étape adresse sont généralement après ceux de l'étape identité
    // On prend les comboboxes qui ne sont pas dans l'étape identité
    // L'étape adresse commence après le texte "Votre adresse de résidence"
    const addressStart = page.locator('text=/Votre adresse de résidence/i');
    if (await addressStart.count() > 0) {
      // Prendre les comboboxes après ce texte
      for (let i = 0; i < pageCount; i++) {
        const combobox = pageComboboxes.nth(i);
        const isAfterAddress = await combobox.evaluate((el: HTMLElement, startText: string) => {
          const startEl = document.evaluate(
            `//text()[contains(., '${startText}')]`,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue;
          if (!startEl) return false;
          const startPos = startEl.compareDocumentPosition(el);
          return (startPos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
        }, 'Votre adresse').catch(() => false);
        
        if (isAfterAddress && i + 3 < pageCount) {
          // 1. Province
          await pageComboboxes.nth(i).click();
          await page.waitForTimeout(500);
          await page.waitForSelector('[role="option"]', { timeout: 5000 });
          await page.locator(`[role="option"]:has-text("${data.province}")`).first().click();
          await page.waitForTimeout(2000);
          
          // 2. Commune
          await pageComboboxes.nth(i + 1).click();
          await page.waitForTimeout(500);
          await page.waitForSelector('[role="option"]', { timeout: 10000 });
          await page.locator(`[role="option"]:has-text("${data.commune}")`).first().click();
          await page.waitForTimeout(2000);
          
          // 3. District
          await pageComboboxes.nth(i + 2).click();
          await page.waitForTimeout(500);
          await page.waitForSelector('[role="option"]', { timeout: 10000 });
          await page.locator(`[role="option"]:has-text("${data.district}")`).first().click();
          await page.waitForTimeout(2000);
          
          // 4. Quartier
          await pageComboboxes.nth(i + 3).click();
          await page.waitForTimeout(500);
          await page.waitForSelector('[role="option"]', { timeout: 10000 });
          await page.locator(`[role="option"]:has-text("${data.quarter}")`).first().click();
          await page.waitForTimeout(1000);
          break;
        }
      }
    }
  } else {
    // 1. Province - Premier combobox
    const provinceSelect = allComboboxes.nth(0);
    await provinceSelect.waitFor({ state: 'visible', timeout: 10000 });
    await provinceSelect.click();
    await page.waitForTimeout(500);
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    await page.locator(`[role="option"]:has-text("${data.province}")`).first().click();
    await page.waitForTimeout(2000);

    // 2. Commune/Ville - Deuxième combobox
    const communeSelect = allComboboxes.nth(1);
    await communeSelect.waitFor({ state: 'visible', timeout: 10000 });
    await communeSelect.click();
    await page.waitForTimeout(500);
    await page.waitForSelector('[role="option"]', { timeout: 10000 });
    await page.locator(`[role="option"]:has-text("${data.commune}")`).first().click();
    await page.waitForTimeout(2000);

    // 3. District/Arrondissement - Troisième combobox
    const districtSelect = allComboboxes.nth(2);
    await districtSelect.waitFor({ state: 'visible', timeout: 10000 });
    await districtSelect.click();
    await page.waitForTimeout(500);
    await page.waitForSelector('[role="option"]', { timeout: 10000 });
    await page.locator(`[role="option"]:has-text("${data.district}")`).first().click();
    await page.waitForTimeout(2000);

    // 4. Quartier - Quatrième combobox
    const quarterSelect = allComboboxes.nth(3);
    await quarterSelect.waitFor({ state: 'visible', timeout: 10000 });
    await quarterSelect.click();
    await page.waitForTimeout(500);
    await page.waitForSelector('[role="option"]', { timeout: 10000 });
    await page.locator(`[role="option"]:has-text("${data.quarter}")`).first().click();
    await page.waitForTimeout(1000);
  }

  // 5. Rue - Textarea ou Input avec name="address.street"
  const streetInput = page.locator('input[name="address.street"], textarea[name="address.street"]').first();
  if (await streetInput.count() > 0) {
    await streetInput.waitFor({ state: 'visible', timeout: 5000 });
    await streetInput.fill(data.street);
  }

  // 6. Code postal (optionnel)
  const postalCodeInput = page.locator('input[name="address.postalCode"]').first();
  if (await postalCodeInput.count() > 0) {
    await postalCodeInput.fill(data.postalCode);
  }

  await page.waitForTimeout(1000);
}

/**
 * Remplit l'étape 3 (Profession) - Basé sur CompanyStepV2
 */
async function fillCompanyStep(page: any, data = TEST_DATA.company) {
  await page.waitForTimeout(1000);

  // 1. Employé ou non - Switch
  // Chercher tous les switches et prendre celui qui est dans la section "Informations professionnelles"
  const allSwitches = page.locator('[role="switch"]');
  const switchCount = await allSwitches.count();
  
  if (switchCount > 0) {
    // Le switch de l'entreprise est généralement le dernier (après celui de la voiture à l'étape 1)
    // Ou chercher près du texte "Sans emploi" ou "Je travaille actuellement"
    let isEmployedSwitch = null;
    
    // Essayer de trouver le switch près du texte "Sans emploi"
    const sansEmploiText = page.locator('text=/Sans emploi|Je travaille actuellement/i').first();
    if (await sansEmploiText.count() > 0) {
      const parentContainer = sansEmploiText.locator('..').locator('..').locator('..');
      isEmployedSwitch = parentContainer.locator('[role="switch"]').first();
    }
    
    // Si pas trouvé, prendre le dernier switch
    if (!isEmployedSwitch || await isEmployedSwitch.count() === 0) {
      isEmployedSwitch = allSwitches.nth(switchCount - 1);
    }
    
    if (await isEmployedSwitch.count() > 0) {
      const isChecked = await isEmployedSwitch.isChecked().catch(() => false);
      if (data.isEmployed && !isChecked) {
        await isEmployedSwitch.click();
        await page.waitForTimeout(2000); // Attendre que le formulaire conditionnel apparaisse
      }
    }
  }

  // Si employé, remplir les champs de l'entreprise
  if (data.isEmployed) {
    // 2. Nom de l'entreprise
    const companyInput = page.locator('input[name*="companyName" i], input[placeholder*="entreprise" i]').first();
    await companyInput.waitFor({ state: 'visible', timeout: 5000 });
    await companyInput.fill(data.companyName);
    await page.waitForTimeout(500);

    // 3. Adresse de l'entreprise - Utiliser l'onglet "Base de données"
    // Vérifier qu'on est sur l'onglet "Base de données" (par défaut)
    const databaseTab = page.locator('button[role="tab"]:has-text("Base de données")');
    if (await databaseTab.count() > 0) {
      await databaseTab.click();
      await page.waitForTimeout(500);
    }

    // Province de l'entreprise
    const companyProvinceSelect = page.locator('label:has-text("Province")').locator('..').locator('button[role="combobox"]').first();
    if (await companyProvinceSelect.count() > 0) {
      await companyProvinceSelect.click();
      await page.waitForTimeout(500);
      await page.waitForSelector('[role="option"]', { timeout: 5000 });
      // Chercher la province dans les options
      const provinceOption = page.locator(`[role="option"]:has-text("${data.address?.province || 'Estuaire'}")`).first();
      if (await provinceOption.count() > 0) {
        await provinceOption.click();
        await page.waitForTimeout(1000);
      }
    }

    // Ville de l'entreprise
    const companyCommuneSelect = page.locator('label:has-text("Ville")').locator('..').locator('button[role="combobox"]').first();
    if (await companyCommuneSelect.count() > 0) {
      await companyCommuneSelect.waitFor({ state: 'visible', timeout: 5000 });
      await companyCommuneSelect.click();
      await page.waitForTimeout(500);
      await page.waitForSelector('[role="option"]', { timeout: 5000 });
      // Chercher la commune dans les options
      const communeOption = page.locator(`[role="option"]:has-text("${data.address?.city || 'Libreville Centre'}")`).first();
      if (await communeOption.count() > 0) {
        await communeOption.click();
        await page.waitForTimeout(1000);
      }
    }

    // Arrondissement de l'entreprise
    const companyDistrictSelect = page.locator('label:has-text("Arrondissement")').locator('..').locator('button[role="combobox"]').first();
    if (await companyDistrictSelect.count() > 0) {
      await companyDistrictSelect.waitFor({ state: 'visible', timeout: 5000 });
      await companyDistrictSelect.click();
      await page.waitForTimeout(500);
      await page.waitForSelector('[role="option"]', { timeout: 5000 });
      // Prendre le premier arrondissement disponible
      await page.locator('[role="option"]').first().click();
      await page.waitForTimeout(1000);
    }

    // Quartier de l'entreprise
    const companyQuarterSelect = page.locator('label:has-text("Quartier")').locator('..').locator('button[role="combobox"]').first();
    if (await companyQuarterSelect.count() > 0) {
      await companyQuarterSelect.waitFor({ state: 'visible', timeout: 5000 });
      await companyQuarterSelect.click();
      await page.waitForTimeout(500);
      await page.waitForSelector('[role="option"]', { timeout: 5000 });
      // Prendre le premier quartier disponible
      await page.locator('[role="option"]').first().click();
      await page.waitForTimeout(500);
    }

    // 4. Profession
    const professionInput = page.locator('input[name*="profession" i], input[placeholder*="profession" i]').first();
    if (await professionInput.count() > 0) {
      await professionInput.fill(data.profession);
      await page.waitForTimeout(500);
    }

    // 5. Ancienneté - Chercher un bouton avec le texte de l'ancienneté ou utiliser l'input
    if (data.seniority) {
      // D'abord essayer de cliquer sur un bouton d'ancienneté qui contient le texte
      const seniorityButton = page.locator('button').filter({ hasText: data.seniority }).first();
      if (await seniorityButton.count() > 0) {
        await seniorityButton.click();
        await page.waitForTimeout(500);
      } else {
        // Sinon utiliser l'input
        const seniorityInput = page.locator('input[placeholder*="ancienneté" i], input[placeholder*="durée" i]').first();
        if (await seniorityInput.count() > 0) {
          await seniorityInput.fill(data.seniority);
          await page.waitForTimeout(500);
        }
      }
    }
  }

  await page.waitForTimeout(1000);
}

/**
 * Remplit l'étape 4 (Documents) - Basé sur DocumentsStepV2
 */
async function fillDocumentsStep(page: any) {
  await page.waitForTimeout(1000);
  
  // 1. Type de document - Select avec label "Type de document"
  const docTypeSelect = page.locator('label:has-text("Type de document")').locator('..').locator('button[role="combobox"]').first();
  await docTypeSelect.click();
  await page.waitForTimeout(500);
  await page.waitForSelector('[role="option"]', { timeout: 5000 });
  await page.locator('[role="option"]').first().click(); // Prendre le premier type disponible
  await page.waitForTimeout(500);

  // 2. Numéro de document - Input avec name="documents.identityDocumentNumber"
  const docNumberInput = page.locator('input[name="documents.identityDocumentNumber"]');
  await docNumberInput.fill('123456789');
  await page.waitForTimeout(500);

  // 3. Date de délivrance et Date d'expiration
  // Utiliser une approche plus robuste : chercher tous les comboboxes et utiliser les index
  // Index 0 = Type de document (déjà rempli)
  // Index 1, 2, 3 = Date de délivrance (jour, mois, année)
  // Index 4, 5, 6 = Date d'expiration (jour, mois, année)
  
  const allComboboxes = page.locator('button[role="combobox"]');
  
  // Date de délivrance - Jour
  await allComboboxes.nth(1).click();
  await page.waitForTimeout(500);
  await page.waitForSelector('[role="option"]', { timeout: 5000 });
  await page.locator('[role="option"]:has-text("11")').click();
  await page.waitForTimeout(500);
  
  // Date de délivrance - Mois
  await allComboboxes.nth(2).click();
  await page.waitForTimeout(500);
  await page.waitForSelector('[role="option"]', { timeout: 5000 });
  await page.locator('[role="option"]:has-text("Juin")').click();
  await page.waitForTimeout(500);
  
  // Date de délivrance - Année
  await allComboboxes.nth(3).click();
  await page.waitForTimeout(500);
  await page.waitForSelector('[role="option"]', { timeout: 5000 });
  // Prendre l'année actuelle - 2 ans
  const currentYear = new Date().getFullYear();
  await page.locator(`[role="option"]:has-text("${currentYear - 2}")`).click();
  await page.waitForTimeout(1000);

  // 4. Date d'expiration - Jour
  await allComboboxes.nth(4).click();
  await page.waitForTimeout(500);
  await page.waitForSelector('[role="option"]', { timeout: 5000 });
  await page.locator('[role="option"]:has-text("15")').click();
  await page.waitForTimeout(500);
  
  // Date d'expiration - Mois
  await allComboboxes.nth(5).click();
  await page.waitForTimeout(500);
  await page.waitForSelector('[role="option"]', { timeout: 5000 });
  await page.locator('[role="option"]:has-text("Décembre")').click();
  await page.waitForTimeout(500);
  
  // Date d'expiration - Année
  await allComboboxes.nth(6).click();
  await page.waitForTimeout(500);
  await page.waitForSelector('[role="option"]', { timeout: 5000 });
  // Prendre une année future (année actuelle + 5 ans)
  await page.locator(`[role="option"]:has-text("${currentYear + 5}")`).click();
  await page.waitForTimeout(1000);

  // 5. Lieu de délivrance - Input avec name="documents.issuingPlace"
  const issuingPlaceInput = page.locator('input[name="documents.issuingPlace"]');
  await issuingPlaceInput.fill('Libreville');
  await page.waitForTimeout(500);

  // 6. Photo recto - Upload du fichier de test
  const testImagePath = '/Users/glenneriss/Documents/projets/kara-client-front/tests/fixtures/images/test-document.png';
  const frontPhotoInput = page.locator('input[type="file"]').first();
  await frontPhotoInput.setInputFiles(testImagePath);
  await page.waitForTimeout(3000); // Attendre la compression et l'aperçu

  // 7. Accepter les conditions - Checkbox
  // Chercher le checkbox pour accepter les conditions
  const termsCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /condition|term|accepter/i }).first();
  if (await termsCheckbox.count() === 0) {
    // Chercher par label avec filter
    const termsLabel = page.locator('label').filter({ hasText: /condition|term|accepter/i }).first();
    if (await termsLabel.count() > 0) {
      await termsLabel.click();
    } else {
      // Chercher directement un checkbox près du texte "condition" ou "accepter"
      const termsSection = page.locator('text').filter({ hasText: /condition|term|accepter/i }).first();
      if (await termsSection.count() > 0) {
        const nearbyCheckbox = termsSection.locator('..').locator('input[type="checkbox"]').first();
        if (await nearbyCheckbox.count() > 0) {
          await nearbyCheckbox.check({ force: true });
        }
      }
    }
  } else {
    await termsCheckbox.check({ force: true });
  }
  await page.waitForTimeout(1000);
}

/**
 * Passe à l'étape suivante
 */
async function goToNextStep(page: any) {
  const nextButton = page.locator('button:has-text("Suivant")').first();
  await nextButton.waitFor({ state: 'visible', timeout: 10000 });
  await nextButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  
  // Vérifier que le bouton n'est pas désactivé
  const isDisabled = await nextButton.isDisabled().catch(() => false);
  if (isDisabled) {
    // Prendre une capture d'écran pour debug
    await page.screenshot({ path: 'test-results/validation-errors.png', fullPage: true });
    // Attendre un peu pour voir si les erreurs se résolvent
    await page.waitForTimeout(2000);
  }
  
  await nextButton.click({ force: true });
  await page.waitForTimeout(3000);
}

// ==================== TESTS ====================

// ==================== TESTS ÉTAPE 1 ====================

test.describe('Étape 1 - Identité - Tests complets', () => {
  test.beforeEach(async ({ page }) => {
    await goToRegisterPage(page);
  });

  /**
   * Vérifie que tous les champs de l'étape 1 contiennent les valeurs attendues
   */
  async function verifyIdentityStepFields(page: any, expectedData: any) {
    // Civilité
    if (expectedData.civility) {
      const civilitySelect = page.locator('label:has-text("Civilité")').locator('..').locator('button[role="combobox"]').first();
      const civilityText = await civilitySelect.textContent();
      expect(civilityText).toContain(expectedData.civility);
    }

    // Nom
    const lastNameInput = page.locator('input[name="identity.lastName"]');
    if (expectedData.lastName) {
      await expect(lastNameInput).toHaveValue(expectedData.lastName);
    }

    // Prénom (optionnel)
    const firstNameInput = page.locator('input[name="identity.firstName"]');
    if (expectedData.firstName) {
      if (await firstNameInput.count() > 0) {
        await expect(firstNameInput).toHaveValue(expectedData.firstName);
      }
    } else {
      // Si pas de prénom attendu, vérifier que le champ est vide ou n'existe pas
      if (await firstNameInput.count() > 0) {
        const value = await firstNameInput.inputValue();
        expect(value).toBe('');
      }
    }

    // Date de naissance
    if (expectedData.birthDate) {
      const birthDateSection = page.locator('label:has-text("Date de naissance")').locator('..');
      const birthDateSelects = birthDateSection.locator('button[role="combobox"]');
      
      // Attendre que les selects soient initialisés (ne pas afficher le placeholder)
      // On attend que le premier select ne soit plus "Jour"
      if (expectedData.birthDate.day) {
        const daySelect = birthDateSelects.nth(0);
        // Attendre jusqu'à 10 secondes que le select contienne la valeur attendue (pas le placeholder)
        await expect(daySelect).not.toContainText('Jour', { timeout: 10000 });
        await expect(daySelect).toContainText(expectedData.birthDate.day, { timeout: 5000 });
      }

      // Vérifier le mois
      if (expectedData.birthDate.month) {
        const monthSelect = birthDateSelects.nth(1);
        const monthLabels = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const monthIndex = parseInt(expectedData.birthDate.month) - 1;
        await expect(monthSelect).not.toContainText('Mois', { timeout: 10000 });
        await expect(monthSelect).toContainText(monthLabels[monthIndex], { timeout: 5000 });
      }

      // Vérifier l'année
      if (expectedData.birthDate.year) {
        const yearSelect = birthDateSelects.nth(2);
        await expect(yearSelect).not.toContainText('Année', { timeout: 10000 });
        await expect(yearSelect).toContainText(expectedData.birthDate.year, { timeout: 5000 });
      }
    }

    // Lieu de naissance
    const birthPlaceInput = page.locator('input[name="identity.birthPlace"]');
    if (expectedData.birthPlace) {
      await expect(birthPlaceInput).toHaveValue(expectedData.birthPlace);
    }

    // Numéro d'acte de naissance
    const birthCertInput = page.locator('input[name="identity.birthCertificateNumber"]');
    if (expectedData.birthCertificateNumber) {
      await expect(birthCertInput).toHaveValue(expectedData.birthCertificateNumber);
    }

    // Nationalité
    if (expectedData.nationality) {
      const nationalitySelect = page.locator('label:has-text("Nationalité")').locator('..').locator('button[role="combobox"]').first();
      const nationalityText = await nationalitySelect.textContent();
      expect(nationalityText).toContain(expectedData.nationality);
    }

    // Genre
    if (expectedData.gender) {
      const genderSelect = page.locator('label:has-text("Genre")').locator('..').locator('button[role="combobox"]').first();
      const genderText = await genderSelect.textContent();
      expect(genderText).toContain(expectedData.gender);
    }

    // Statut marital
    if (expectedData.maritalStatus) {
      const maritalSelect = page.locator('label:has-text("Situation matrimoniale")').locator('..').locator('button[role="combobox"]').first();
      const maritalText = await maritalSelect.textContent();
      expect(maritalText).toContain(expectedData.maritalStatus);
    }

    // Religion
    if (expectedData.religion) {
      const religionSelect = page.locator('label:has-text("Religion")').locator('..').locator('button[role="combobox"]').first();
      const religionText = await religionSelect.textContent();
      expect(religionText).toContain(expectedData.religion);
    }

    // Lieu de prière
    const prayerPlaceInput = page.locator('input[name="identity.prayerPlace"]');
    if (expectedData.prayerPlace) {
      await expect(prayerPlaceInput).toHaveValue(expectedData.prayerPlace);
    }

    // Code entremetteur
    const intermediaryInput = page.locator('input[name="identity.intermediaryCode"]');
    if (expectedData.intermediaryCode) {
      await expect(intermediaryInput).toHaveValue(expectedData.intermediaryCode);
    }

    // Téléphone
    const phoneInput = page.locator('input[type="tel"]').first();
    if (expectedData.phone) {
      // Le téléphone est formaté avec des espaces, on vérifie qu'il contient les chiffres
      const phoneValue = await phoneInput.inputValue();
      const phoneDigits = phoneValue.replace(/\s/g, '');
      expect(phoneDigits).toContain(expectedData.phone);
    }

    // Email (optionnel)
    const emailInput = page.locator('input[type="email"]');
    if ((expectedData as any).email) {
      if (await emailInput.count() > 0) {
        await expect(emailInput.first()).toHaveValue((expectedData as any).email);
      }
    }

    // Voiture
    if ((expectedData as any).hasCar !== undefined) {
      const hasCarSwitch = page.locator('button[role="switch"]').first();
      if (await hasCarSwitch.count() > 0) {
        const isChecked = await hasCarSwitch.getAttribute('aria-checked');
        expect(isChecked === 'true').toBe((expectedData as any).hasCar);
      }
    }

    // Informations du conjoint (si marié/concubinage)
    if (expectedData.maritalStatus === 'Marié(e)' || expectedData.maritalStatus === 'Concubinage') {
      const spouseLastNameInput = page.locator('input[name="identity.spouseLastName"]');
      if ((expectedData as any).spouseLastName) {
        await expect(spouseLastNameInput).toHaveValue((expectedData as any).spouseLastName);
      }

      const spouseFirstNameInput = page.locator('input[name="identity.spouseFirstName"]');
      if ((expectedData as any).spouseFirstName) {
        await expect(spouseFirstNameInput).toHaveValue((expectedData as any).spouseFirstName);
      }

      const spousePhoneInput = page.locator('input[type="tel"]').nth(1); // Le deuxième input tel est celui du conjoint
      if ((expectedData as any).spousePhone) {
        const spousePhoneValue = await spousePhoneInput.inputValue();
        const spousePhoneDigits = spousePhoneValue.replace(/\s/g, '');
        expect(spousePhoneDigits).toContain((expectedData as any).spousePhone);
      }
    }
  }

  test('devrait remplir l\'étape 1 avec prénom et sans voiture (célibataire)', async ({ page }) => {
    const testData = {
      civility: 'Monsieur',
      lastName: 'NDONG',
      firstName: 'Jean-Marc',
      birthDate: { day: '15', month: '06', year: '1996' },
      birthPlace: 'Libreville',
      birthCertificateNumber: 'LBV-1996-458721',
      prayerPlace: 'Paroisse Saint-Michel – Libreville',
      religion: 'Christianisme',
      phone: '65671734',
      gender: 'Homme',
      nationality: 'Gabonaise',
      maritalStatus: 'Célibataire',
      intermediaryCode: 'AIMOND.MK.2024',
      hasCar: false,
    };

    await fillIdentityStep(page, testData);
    
    // Vérifier que l'étape 1 est bien remplie
    await verifyIdentityStepFields(page, testData);
  });

  test('devrait remplir l\'étape 1 sans prénom et avec voiture (célibataire)', async ({ page }) => {
    const testData = {
      civility: 'Madame',
      lastName: 'MBOUMBA',
      firstName: '', // Pas de prénom
      birthDate: { day: '20', month: '08', year: '1995' },
      birthPlace: 'Port-Gentil',
      birthCertificateNumber: 'PG-1995-123456',
      prayerPlace: 'Mosquée centrale',
      religion: 'Islam',
      phone: '77451234',
      gender: 'Femme',
      nationality: 'Gabonaise',
      maritalStatus: 'Célibataire',
      intermediaryCode: '1234.MK.5678',
      hasCar: true,
    };

    await fillIdentityStep(page, testData);
    
    // Activer la voiture si nécessaire
    const hasCarSwitch = page.locator('button[role="switch"]').first();
    if (await hasCarSwitch.count() > 0) {
      const isChecked = await hasCarSwitch.getAttribute('aria-checked');
      if (isChecked !== 'true') {
        await hasCarSwitch.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Vérifier que l'étape 1 est bien remplie
    await verifyIdentityStepFields(page, testData);
  });

  test('devrait remplir l\'étape 1 avec conjoint (concubinage)', async ({ page }) => {
    const testData = {
      civility: 'Madame',
      lastName: 'MBOUMBA',
      firstName: 'Sophie',
      birthDate: { day: '10', month: '05', year: '1992' },
      birthPlace: 'Port-Gentil',
      birthCertificateNumber: 'PG-1992-789012',
      prayerPlace: 'Temple',
      religion: 'Christianisme',
      phone: '60123456',
      gender: 'Femme',
      nationality: 'Gabonaise',
      maritalStatus: 'Concubinage',
      intermediaryCode: '5678.MK.9012',
      hasCar: true,
      spouseLastName: 'NDONG',
      spouseFirstName: 'Pierre',
      spousePhone: '65654321',
    };

    await fillIdentityStep(page, testData);
    
    // Remplir les informations du conjoint
    await page.waitForTimeout(1000);
    
    const spouseLastNameInput = page.locator('input[name="identity.spouseLastName"]');
    await spouseLastNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await spouseLastNameInput.fill(testData.spouseLastName);
    await page.waitForTimeout(300);

    const spouseFirstNameInput = page.locator('input[name="identity.spouseFirstName"]');
    await spouseFirstNameInput.fill(testData.spouseFirstName);
    await page.waitForTimeout(300);

    // Téléphone du conjoint (deuxième input tel)
    const spousePhoneInput = page.locator('input[type="tel"]').nth(1);
    await spousePhoneInput.waitFor({ state: 'visible', timeout: 5000 });
    await spousePhoneInput.click();
    await page.waitForTimeout(200);
    await spousePhoneInput.type(testData.spousePhone, { delay: 50 });
    await page.waitForTimeout(1000);
    
    // Vérifier que l'étape 1 est bien remplie
    await verifyIdentityStepFields(page, testData);
  });

  test('devrait remplir l\'étape 1 avec conjoint (marié)', async ({ page }) => {
    const testData = {
      civility: 'Monsieur',
      lastName: 'NDONG',
      firstName: 'Jean-Marc',
      birthDate: { day: '15', month: '06', year: '1996' },
      birthPlace: 'Libreville',
      birthCertificateNumber: 'LBV-1996-458721',
      prayerPlace: 'Paroisse Saint-Michel – Libreville',
      religion: 'Christianisme',
      phone: '65671734',
      gender: 'Homme',
      nationality: 'Gabonaise',
      maritalStatus: 'Marié(e)',
      intermediaryCode: 'AIMOND.MK.2024',
      hasCar: false,
      spouseLastName: 'OKOME',
      spouseFirstName: 'Marie',
      spousePhone: '77736900',
    };

    await fillIdentityStep(page, testData);
    
    // Remplir les informations du conjoint
    await page.waitForTimeout(1000); // Attendre que la section apparaisse
    
    const spouseLastNameInput = page.locator('input[name="identity.spouseLastName"]');
    await spouseLastNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await spouseLastNameInput.fill(testData.spouseLastName);
    await page.waitForTimeout(300);

    const spouseFirstNameInput = page.locator('input[name="identity.spouseFirstName"]');
    await spouseFirstNameInput.fill(testData.spouseFirstName);
    await page.waitForTimeout(300);

    // Téléphone du conjoint (deuxième input tel)
    const spousePhoneInput = page.locator('input[type="tel"]').nth(1);
    await spousePhoneInput.waitFor({ state: 'visible', timeout: 5000 });
    await spousePhoneInput.click();
    await page.waitForTimeout(200);
    await spousePhoneInput.type(testData.spousePhone, { delay: 50 });
    await page.waitForTimeout(1000);
    
    // Vérifier que l'étape 1 est bien remplie
    await verifyIdentityStepFields(page, testData);
  });

  test('devrait conserver les données après actualisation de la page', async ({ page }) => {
    const testData = {
      civility: 'Monsieur',
      lastName: 'NDONG',
      firstName: 'Jean-Marc',
      birthDate: { day: '15', month: '06', year: '1996' },
      birthPlace: 'Libreville',
      birthCertificateNumber: 'LBV-1996-458721',
      prayerPlace: 'Paroisse Saint-Michel – Libreville',
      religion: 'Christianisme',
      phone: '65671734',
      gender: 'Homme',
      nationality: 'Gabonaise',
      maritalStatus: 'Célibataire',
      intermediaryCode: 'AIMOND.MK.2024',
      hasCar: false,
    };

    // Remplir l'étape 1
    await fillIdentityStep(page, testData);
    await page.waitForTimeout(3000); // Attendre la sauvegarde automatique

    // Vérifier que les données sont bien sauvegardées dans localStorage
    const cachedData = await page.evaluate(() => {
      return localStorage.getItem('kara-register-form-v2');
    });
    expect(cachedData).toBeTruthy();

    // Actualiser la page
    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Attendre que le formulaire soit restauré depuis le localStorage
    // Vérifier que le champ lastName est rempli (indicateur que le formulaire est restauré)
    const lastNameInput = page.locator('input[name="identity.lastName"]');
    await expect(lastNameInput).toHaveValue(testData.lastName, { timeout: 15000 });
    
    // Attendre un peu plus pour que les useEffect dans IdentityStepV2 initialisent les selects de date
    await page.waitForTimeout(3000);

    // Vérifier que tous les champs sont toujours remplis
    await verifyIdentityStepFields(page, testData);
  });

  test.skip('devrait réinitialiser l\'étape 1 après clic sur Réinitialiser', async ({ page }) => {
    const testData = {
      civility: 'Monsieur',
      lastName: 'NDONG',
      firstName: 'Jean-Marc',
      birthDate: { day: '15', month: '06', year: '1996' },
      birthPlace: 'Libreville',
      birthCertificateNumber: 'LBV-1996-458721',
      prayerPlace: 'Paroisse Saint-Michel – Libreville',
      religion: 'Christianisme',
      phone: '65671734',
      gender: 'Homme',
      nationality: 'Gabonaise',
      maritalStatus: 'Célibataire',
      intermediaryCode: 'AIMOND.MK.2024',
      hasCar: false,
    };

    // Remplir l'étape 1
    await fillIdentityStep(page, testData);
    await page.waitForTimeout(2000);

    // Vérifier que le champ est bien rempli avant réinitialisation
    const lastNameInputBefore = page.locator('input[name="identity.lastName"]');
    await expect(lastNameInputBefore).toHaveValue(testData.lastName);

    // Écouter le dialogue de confirmation avant de cliquer
    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    // Cliquer sur Réinitialiser
    const resetButton = page.locator('button:has-text("Réinitialiser")');
    await resetButton.waitFor({ state: 'visible', timeout: 10000 });
    await resetButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await resetButton.click();
    await page.waitForTimeout(3000); // Attendre la réinitialisation

    // Vérifier que les champs principaux sont vides
    const lastNameInput = page.locator('input[name="identity.lastName"]');
    await expect(lastNameInput).toHaveValue('', { timeout: 10000 });

    const birthPlaceInput = page.locator('input[name="identity.birthPlace"]');
    await expect(birthPlaceInput).toHaveValue('', { timeout: 5000 });

    const intermediaryInput = page.locator('input[name="identity.intermediaryCode"]');
    await expect(intermediaryInput).toHaveValue('', { timeout: 5000 });
  });

  test.skip('devrait conserver les données après navigation (Suivant puis Précédent)', async ({ page }) => {
    const testData = {
      civility: 'Monsieur',
      lastName: 'NDONG',
      firstName: 'Jean-Marc',
      birthDate: { day: '15', month: '06', year: '1996' },
      birthPlace: 'Libreville',
      birthCertificateNumber: 'LBV-1996-458721',
      prayerPlace: 'Paroisse Saint-Michel – Libreville',
      religion: 'Christianisme',
      phone: '65671734',
      gender: 'Homme',
      nationality: 'Gabonaise',
      maritalStatus: 'Célibataire',
      intermediaryCode: 'AIMOND.MK.2024',
      hasCar: false,
    };

    // Remplir l'étape 1
    await fillIdentityStep(page, testData);
    await page.waitForTimeout(2000);

    // Aller à l'étape suivante
    const nextButton = page.locator('button:has-text("Suivant")');
    await nextButton.waitFor({ state: 'visible', timeout: 10000 });
    await nextButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await nextButton.click();
    await page.waitForTimeout(3000);

    // Vérifier qu'on est à l'étape 2
    await expect(page.locator('text=/Étape 2|Adresse/i').first()).toBeVisible({ timeout: 15000 });

    // Revenir à l'étape 1
    const prevButton = page.locator('button:has-text("Précédent")');
    await prevButton.waitFor({ state: 'visible', timeout: 10000 });
    await prevButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await prevButton.click();
    await page.waitForTimeout(3000);

    // Attendre que les champs soient restaurés
    const lastNameInput = page.locator('input[name="identity.lastName"]');
    await expect(lastNameInput).toHaveValue(testData.lastName, { timeout: 10000 });

    // Vérifier les champs principaux (simplification du test)
    const birthPlaceInput = page.locator('input[name="identity.birthPlace"]');
    await expect(birthPlaceInput).toHaveValue(testData.birthPlace, { timeout: 5000 });

    const intermediaryInput = page.locator('input[name="identity.intermediaryCode"]');
    await expect(intermediaryInput).toHaveValue(testData.intermediaryCode, { timeout: 5000 });
    
    // Vérifier le téléphone
    const phoneInput = page.locator('input[type="tel"]').first();
    const phoneValue = await phoneInput.inputValue();
    const phoneDigits = phoneValue.replace(/\s/g, '');
    expect(phoneDigits).toContain(testData.phone);
  });

  test.skip('devrait conserver les données du conjoint après navigation', async ({ page }) => {
    const testData = {
      civility: 'Monsieur',
      lastName: 'NDONG',
      firstName: 'Jean-Marc',
      birthDate: { day: '15', month: '06', year: '1996' },
      birthPlace: 'Libreville',
      birthCertificateNumber: 'LBV-1996-458721',
      prayerPlace: 'Paroisse Saint-Michel – Libreville',
      religion: 'Christianisme',
      phone: '65671734',
      gender: 'Homme',
      nationality: 'Gabonaise',
      maritalStatus: 'Marié(e)',
      intermediaryCode: 'AIMOND.MK.2024',
      hasCar: false,
      spouseLastName: 'OKOME',
      spouseFirstName: 'Marie',
      spousePhone: '77736900',
    };

    // Remplir l'étape 1 avec conjoint
    await fillIdentityStep(page, testData);
    
    // Remplir les informations du conjoint
    await page.waitForTimeout(1000);
    const spouseLastNameInput = page.locator('input[name="identity.spouseLastName"]');
    await spouseLastNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await spouseLastNameInput.fill(testData.spouseLastName);
    await page.waitForTimeout(300);

    const spouseFirstNameInput = page.locator('input[name="identity.spouseFirstName"]');
    await spouseFirstNameInput.fill(testData.spouseFirstName);
    await page.waitForTimeout(300);

    const spousePhoneInput = page.locator('input[type="tel"]').nth(1);
    await spousePhoneInput.waitFor({ state: 'visible', timeout: 5000 });
    await spousePhoneInput.click();
    await page.waitForTimeout(200);
    await spousePhoneInput.type(testData.spousePhone, { delay: 50 });
    await page.waitForTimeout(1000);

    // Aller à l'étape suivante
    const nextButton = page.locator('button:has-text("Suivant")');
    await nextButton.waitFor({ state: 'visible', timeout: 10000 });
    await nextButton.click();
    await page.waitForTimeout(3000);

    // Vérifier qu'on est à l'étape 2
    await expect(page.locator('text=/Étape 2|Adresse/i').first()).toBeVisible({ timeout: 15000 });

    // Revenir à l'étape 1
    const prevButton = page.locator('button:has-text("Précédent")');
    await prevButton.waitFor({ state: 'visible', timeout: 10000 });
    await prevButton.click();
    await page.waitForTimeout(3000);

    // Vérifier que les données principales sont conservées
    const lastNameInput = page.locator('input[name="identity.lastName"]');
    await expect(lastNameInput).toHaveValue(testData.lastName, { timeout: 10000 });

    // Vérifier les données du conjoint
    const spouseLastNameCheck = page.locator('input[name="identity.spouseLastName"]');
    await expect(spouseLastNameCheck).toHaveValue(testData.spouseLastName, { timeout: 10000 });

    const spouseFirstNameCheck = page.locator('input[name="identity.spouseFirstName"]');
    await expect(spouseFirstNameCheck).toHaveValue(testData.spouseFirstName, { timeout: 5000 });
  });
});

test.describe('Module Inscription - Soumission complète', () => {
  test.beforeEach(async ({ page }) => {
    await goToRegisterPage(page);
  });

  test('devrait remplir et soumettre le formulaire complet', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes pour ce test complet
    
    // Étape 1: Identité
    await fillIdentityStep(page);
    await goToNextStep(page);
    
    // Vérifier qu'on est bien sur l'étape 2
    await expect(page.locator('text=/Étape 2|Adresse/i').first()).toBeVisible({ timeout: 10000 });

    // Étape 2: Adresse
    await fillAddressStep(page);
    await goToNextStep(page);
    
    // Vérifier qu'on est bien sur l'étape 3
    await expect(page.locator('text=/Étape 3|Profession/i').first()).toBeVisible({ timeout: 10000 });

    // Étape 3: Profession
    await fillCompanyStep(page);
    await goToNextStep(page);
    
    // Vérifier qu'on est bien sur l'étape 4
    await expect(page.locator('text=/Étape 4|Documents/i').first()).toBeVisible({ timeout: 10000 });

    // Étape 4: Documents
    await fillDocumentsStep(page);
    await page.waitForTimeout(2000);
    
    // Chercher le bouton "Finaliser" (type="submit" à l'étape 4)
    const submitButton = page.locator('button[type="submit"]:has-text("Finaliser")').first();
    await expect(submitButton).toBeVisible({ timeout: 15000 });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    
    // Cliquer sur le bouton de soumission
    await submitButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await submitButton.click({ force: true });
    
    // Attendre la soumission et la redirection vers la page de paiement
    await page.waitForTimeout(3000);
    
    // Vérifier qu'on est sur la page de finalisation (paiement) ou qu'on a un message de succès
    const paymentPage = page.locator('text=/Finalisation requise|Airtel Money|Mobicash|paiement/i').first();
    const successMessage = page.locator('text=/succès|enregistré|demande créée|merci|demande d\'adhésion/i').first();
    const errorMessage = page.locator('text=/erreur|échec/i').first();
    
    const hasPaymentPage = await paymentPage.count() > 0;
    const hasSuccess = await successMessage.count() > 0;
    const hasError = await errorMessage.count() > 0;
    
    // Le test réussit si on a la page de paiement OU un message de succès (et pas d'erreur)
    expect(hasPaymentPage || hasSuccess).toBeTruthy();
    expect(hasError).toBeFalsy();
  });

  test('devrait remplir tous les champs conditionnels (marié + travail) et soumettre', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes pour le test complet jusqu'à la soumission
    
    // Étape 1: Identité avec statut "Marié(e)"
    const testData = {
      civility: 'Monsieur',
      lastName: 'NDONG',
      firstName: 'Jean-Marc',
      birthDate: { day: '15', month: '06', year: '1996' },
      birthPlace: 'Libreville',
      birthCertificateNumber: 'LBV-1996-458721',
      prayerPlace: 'Paroisse Saint-Michel – Libreville',
      religion: 'Christianisme',
      phone: '65671734',
      gender: 'Homme',
      nationality: 'Gabonaise',
      maritalStatus: 'Marié(e)',
      intermediaryCode: '0000.MK.00001',
      hasCar: false,
      spouseLastName: 'OKOME',
      spouseFirstName: 'Marie',
      spousePhone: '77736900',
    };

    await fillIdentityStep(page, testData);
    
    // Vérifier que les champs du conjoint sont visibles et remplis
    await page.waitForTimeout(1000);
    const spouseLastNameInput = page.locator('input[name="identity.spouseLastName"]');
    await expect(spouseLastNameInput).toBeVisible({ timeout: 5000 });
    await expect(spouseLastNameInput).toHaveValue(testData.spouseLastName, { timeout: 5000 });
    
    const spouseFirstNameInput = page.locator('input[name="identity.spouseFirstName"]');
    await expect(spouseFirstNameInput).toHaveValue(testData.spouseFirstName, { timeout: 5000 });
    
    const spousePhoneInput = page.locator('input[type="tel"]').nth(1);
    // Le téléphone peut être formaté avec des espaces, donc on vérifie que la valeur contient les chiffres
    const spousePhoneValue = await spousePhoneInput.inputValue();
    expect(spousePhoneValue.replace(/\s/g, '')).toContain(testData.spousePhone);
    
    // Passer à l'étape 2
    await goToNextStep(page);
    
    // Étape 2: Adresse
    await fillAddressStep(page);
    await goToNextStep(page);
    
    // Étape 3: Profession avec isEmployed = true
    const companyData = {
      isEmployed: true,
      companyName: 'Total Gabon',
      profession: 'Ingénieur',
      seniority: '5 ans',
      address: {
        province: 'Estuaire',
        city: 'Libreville Centre',
        district: 'Centre-Ville',
        quarter: 'Dakar',
      },
    };
    
    await fillCompanyStep(page, companyData);
    await page.waitForTimeout(2000);
    
    // Vérifier que tous les champs conditionnels sont remplis
    // 1. Nom de l'entreprise
    const companyNameInput = page.locator('input[name*="companyName" i]').first();
    await expect(companyNameInput).toBeVisible({ timeout: 5000 });
    await expect(companyNameInput).toHaveValue(companyData.companyName, { timeout: 5000 });
    
    // 2. Adresse de l'entreprise - Chercher dans la section "Adresse de l'entreprise"
    const companyAddressSection = page.locator('text=/Adresse de l\'entreprise/i').first();
    await expect(companyAddressSection).toBeVisible({ timeout: 5000 });
    
    // Province de l'entreprise (dans la section entreprise)
    const companyProvinceLabel = companyAddressSection.locator('..').locator('..').locator('label:has-text("Province")').first();
    const companyProvinceSelect = companyProvinceLabel.locator('..').locator('button[role="combobox"]').first();
    await expect(companyProvinceSelect).toBeVisible({ timeout: 5000 });
    const provinceValue = await companyProvinceSelect.textContent();
    expect(provinceValue).not.toContain('Sélectionnez');
    expect(provinceValue?.trim().length).toBeGreaterThan(0);
    
    // Ville de l'entreprise
    const companyCommuneLabel = companyAddressSection.locator('..').locator('..').locator('label:has-text("Ville")').first();
    const companyCommuneSelect = companyCommuneLabel.locator('..').locator('button[role="combobox"]').first();
    await expect(companyCommuneSelect).toBeVisible({ timeout: 5000 });
    const communeValue = await companyCommuneSelect.textContent();
    expect(communeValue).not.toContain('Sélectionnez');
    expect(communeValue?.trim().length).toBeGreaterThan(0);
    
    // Arrondissement de l'entreprise
    const companyDistrictLabel = companyAddressSection.locator('..').locator('..').locator('label:has-text("Arrondissement")').first();
    const companyDistrictSelect = companyDistrictLabel.locator('..').locator('button[role="combobox"]').first();
    await expect(companyDistrictSelect).toBeVisible({ timeout: 5000 });
    const districtValue = await companyDistrictSelect.textContent();
    expect(districtValue).not.toContain('Sélectionnez');
    expect(districtValue?.trim().length).toBeGreaterThan(0);
    
    // Quartier de l'entreprise
    const companyQuarterLabel = companyAddressSection.locator('..').locator('..').locator('label:has-text("Quartier")').first();
    const companyQuarterSelect = companyQuarterLabel.locator('..').locator('button[role="combobox"]').first();
    await expect(companyQuarterSelect).toBeVisible({ timeout: 5000 });
    const quarterValue = await companyQuarterSelect.textContent();
    expect(quarterValue).not.toContain('Sélectionnez');
    expect(quarterValue?.trim().length).toBeGreaterThan(0);
    
    // 3. Profession
    const professionInput = page.locator('input[name*="profession" i]').first();
    await expect(professionInput).toBeVisible({ timeout: 5000 });
    await expect(professionInput).toHaveValue(companyData.profession, { timeout: 5000 });
    
    // 4. Ancienneté - Vérifier qu'un bouton est sélectionné ou que l'input a une valeur
    const seniorityInput = page.locator('input[placeholder*="ancienneté" i], input[placeholder*="durée" i]').first();
    if (await seniorityInput.count() > 0) {
      const seniorityValue = await seniorityInput.inputValue();
      expect(seniorityValue).toBeTruthy();
    } else {
      // Vérifier qu'un bouton d'ancienneté est sélectionné (a la classe bg-amber-500)
      const allSeniorityButtons = page.locator('button').filter({ hasText: /ans|mois/i });
      const count = await allSeniorityButtons.count();
      expect(count).toBeGreaterThan(0);
      // Vérifier qu'au moins un bouton est sélectionné en vérifiant le texte du formulaire
      const seniorityField = page.locator('input[name*="seniority" i]').first();
      if (await seniorityField.count() > 0) {
        const seniorityFormValue = await seniorityField.inputValue();
        expect(seniorityFormValue).toBeTruthy();
      }
    }
    
    // Passer à l'étape 4 (Documents)
    await goToNextStep(page);
    
    // Vérifier qu'on est bien sur l'étape 4
    await expect(page.locator('text=/Étape 4|Documents/i').first()).toBeVisible({ timeout: 10000 });
    
    // Étape 4: Documents
    await fillDocumentsStep(page);
    await page.waitForTimeout(2000);
    
    // Chercher le bouton "Finaliser" (type="submit" à l'étape 4)
    const submitButton = page.locator('button[type="submit"]:has-text("Finaliser")').first();
    await expect(submitButton).toBeVisible({ timeout: 15000 });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    
    // Cliquer sur le bouton de soumission
    await submitButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await submitButton.click({ force: true });
    
    // Attendre la soumission et la redirection vers la page de paiement
    await page.waitForTimeout(5000);
    
    // Vérifier qu'on est sur la page de finalisation (paiement) ou qu'on a un message de succès
    const paymentPage = page.locator('text=/Finalisation requise|Airtel Money|Mobicash|paiement/i').first();
    const successMessage = page.locator('text=/succès|enregistré|demande créée|merci|demande d\'adhésion/i').first();
    const errorMessage = page.locator('text=/erreur|échec/i').first();
    
    const hasPaymentPage = await paymentPage.count() > 0;
    const hasSuccess = await successMessage.count() > 0;
    const hasError = await errorMessage.count() > 0;
    
    // Le test réussit si on a la page de paiement OU un message de succès (et pas d'erreur)
    expect(hasPaymentPage || hasSuccess).toBeTruthy();
    expect(hasError).toBeFalsy();
    
    // Log pour confirmer que les données du conjoint et de l'emploi ont été soumises
    console.log('✅ Formulaire soumis avec succès');
    console.log('✅ Données du conjoint soumises:', {
      spouseLastName: testData.spouseLastName,
      spouseFirstName: testData.spouseFirstName,
      spousePhone: testData.spousePhone
    });
    console.log('✅ Données de l\'emploi soumises:', {
      companyName: companyData.companyName,
      profession: companyData.profession,
      seniority: companyData.seniority,
      address: companyData.address
    });
  });
});

// Tests spécifiques pour tablette et mobile
test.describe('Tests responsive - Tablette et Mobile', () => {
  test('devrait remplir et soumettre le formulaire complet sur tablette', async ({ page }) => {
    test.setTimeout(180000);
    
    await goToRegisterPage(page);
    
    // Vérifier la taille de l'écran
    const viewport = page.viewportSize();
    console.log(`📱 Taille d'écran tablette: ${viewport?.width}x${viewport?.height}`);
    
    // Étape 1: Identité
    await fillIdentityStep(page);
    await goToNextStep(page);
    
    // Étape 2: Adresse
    await fillAddressStep(page);
    await goToNextStep(page);
    
    // Étape 3: Profession
    await fillCompanyStep(page);
    await goToNextStep(page);
    
    // Étape 4: Documents
    await expect(page.locator('text=/Étape 4|Documents/i').first()).toBeVisible({ timeout: 10000 });
    await fillDocumentsStep(page);
    await page.waitForTimeout(2000);
    
    // Soumission
    const submitButton = page.locator('button[type="submit"]:has-text("Finaliser")').first();
    await expect(submitButton).toBeVisible({ timeout: 15000 });
    await submitButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await submitButton.click({ force: true });
    
    // Vérifier la redirection
    await page.waitForTimeout(5000);
    const paymentPage = page.locator('text=/Finalisation requise|Airtel Money|Mobicash|paiement/i').first();
    const hasPaymentPage = await paymentPage.count() > 0;
    expect(hasPaymentPage).toBeTruthy();
    
    console.log('✅ Formulaire soumis avec succès sur tablette');
  });

  test('devrait remplir et soumettre le formulaire complet sur mobile', async ({ page }) => {
    test.setTimeout(180000);
    
    await goToRegisterPage(page);
    
    // Vérifier la taille de l'écran
    const viewport = page.viewportSize();
    console.log(`📱 Taille d'écran mobile: ${viewport?.width}x${viewport?.height}`);
    
    // Étape 1: Identité
    await fillIdentityStep(page);
    // Sur mobile, s'assurer que le bouton Suivant est visible
    const nextButton = page.locator('button:has-text("Suivant")');
    await nextButton.scrollIntoViewIfNeeded();
    await goToNextStep(page);
    
    // Étape 2: Adresse
    await fillAddressStep(page);
    await nextButton.scrollIntoViewIfNeeded();
    await goToNextStep(page);
    
    // Étape 3: Profession
    await fillCompanyStep(page);
    await nextButton.scrollIntoViewIfNeeded();
    await goToNextStep(page);
    
    // Étape 4: Documents
    await expect(page.locator('text=/Étape 4|Documents/i').first()).toBeVisible({ timeout: 10000 });
    await fillDocumentsStep(page);
    await page.waitForTimeout(2000);
    
    // Soumission - sur mobile, s'assurer que le bouton est visible
    const submitButton = page.locator('button[type="submit"]:has-text("Finaliser")').first();
    await expect(submitButton).toBeVisible({ timeout: 15000 });
    await submitButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await submitButton.click({ force: true });
    
    // Vérifier la redirection
    await page.waitForTimeout(5000);
    const paymentPage = page.locator('text=/Finalisation requise|Airtel Money|Mobicash|paiement/i').first();
    const hasPaymentPage = await paymentPage.count() > 0;
    expect(hasPaymentPage).toBeTruthy();
    
    console.log('✅ Formulaire soumis avec succès sur mobile');
  });

  test('devrait remplir les champs conditionnels (marié + travail) sur tablette', async ({ page }) => {
    test.setTimeout(180000);
    
    await goToRegisterPage(page);
    
    // Étape 1: Identité avec statut "Marié(e)"
    const testData = {
      civility: 'Monsieur',
      lastName: 'NDONG',
      firstName: 'Jean-Marc',
      birthDate: { day: '15', month: '06', year: '1996' },
      birthPlace: 'Libreville',
      birthCertificateNumber: 'LBV-1996-458721',
      prayerPlace: 'Paroisse Saint-Michel – Libreville',
      religion: 'Christianisme',
      phone: '65671734',
      gender: 'Homme',
      nationality: 'Gabonaise',
      maritalStatus: 'Marié(e)',
      intermediaryCode: '0000.MK.00001',
      hasCar: false,
      spouseLastName: 'OKOME',
      spouseFirstName: 'Marie',
      spousePhone: '77736900',
    };

    await fillIdentityStep(page, testData);
    
    // Vérifier que les champs du conjoint sont visibles
    const spouseLastNameInput = page.locator('input[name="identity.spouseLastName"]');
    await expect(spouseLastNameInput).toBeVisible({ timeout: 5000 });
    await spouseLastNameInput.scrollIntoViewIfNeeded();
    
    await goToNextStep(page);
    
    // Étape 2: Adresse
    await fillAddressStep(page);
    await goToNextStep(page);
    
    // Étape 3: Profession avec isEmployed = true
    const companyData = {
      isEmployed: true,
      companyName: 'Total Gabon',
      profession: 'Ingénieur',
      seniority: '5 ans',
      address: {
        province: 'Estuaire',
        city: 'Libreville Centre',
        district: 'Centre-Ville',
        quarter: 'Dakar',
      },
    };
    
    await fillCompanyStep(page, companyData);
    
    // Vérifier que les champs sont remplis
    const companyNameInput = page.locator('input[name*="companyName" i]').first();
    await expect(companyNameInput).toBeVisible({ timeout: 5000 });
    await expect(companyNameInput).toHaveValue(companyData.companyName, { timeout: 5000 });
    
    console.log('✅ Champs conditionnels remplis avec succès sur tablette');
  });

  test('devrait remplir les champs conditionnels (marié + travail) sur mobile', async ({ page }) => {
    test.setTimeout(180000);
    
    await goToRegisterPage(page);
    
    // Étape 1: Identité avec statut "Marié(e)"
    const testData = {
      civility: 'Monsieur',
      lastName: 'NDONG',
      firstName: 'Jean-Marc',
      birthDate: { day: '15', month: '06', year: '1996' },
      birthPlace: 'Libreville',
      birthCertificateNumber: 'LBV-1996-458721',
      prayerPlace: 'Paroisse Saint-Michel – Libreville',
      religion: 'Christianisme',
      phone: '65671734',
      gender: 'Homme',
      nationality: 'Gabonaise',
      maritalStatus: 'Marié(e)',
      intermediaryCode: '0000.MK.00001',
      hasCar: false,
      spouseLastName: 'OKOME',
      spouseFirstName: 'Marie',
      spousePhone: '77736900',
    };

    await fillIdentityStep(page, testData);
    
    // Vérifier que les champs du conjoint sont visibles et scroll si nécessaire
    const spouseLastNameInput = page.locator('input[name="identity.spouseLastName"]');
    await expect(spouseLastNameInput).toBeVisible({ timeout: 5000 });
    await spouseLastNameInput.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Sur mobile, s'assurer que le bouton Suivant est visible avant de cliquer
    const nextButton = page.locator('button:has-text("Suivant")');
    await nextButton.scrollIntoViewIfNeeded();
    await goToNextStep(page);
    
    // Étape 2: Adresse
    await fillAddressStep(page);
    await nextButton.scrollIntoViewIfNeeded();
    await goToNextStep(page);
    
    // Étape 3: Profession avec isEmployed = true
    const companyData = {
      isEmployed: true,
      companyName: 'Total Gabon',
      profession: 'Ingénieur',
      seniority: '5 ans',
      address: {
        province: 'Estuaire',
        city: 'Libreville Centre',
        district: 'Centre-Ville',
        quarter: 'Dakar',
      },
    };
    
    await fillCompanyStep(page, companyData);
    
    // Vérifier que les champs sont remplis
    const companyNameInput = page.locator('input[name*="companyName" i]').first();
    await expect(companyNameInput).toBeVisible({ timeout: 5000 });
    await companyNameInput.scrollIntoViewIfNeeded();
    await expect(companyNameInput).toHaveValue(companyData.companyName, { timeout: 5000 });
    
    console.log('✅ Champs conditionnels remplis avec succès sur mobile');
  });
});
