# Forfaits en semaines

Le forfait initial dure 1, 2 ou 3 semaines. Le taux saisi par l’administration s’applique une première fois à ce forfait. Le remboursement intégral est prévu à sa première échéance.

Si un versement ne solde pas la dette, le suivi reprend **sept jours après l’échéance précédente**, quelle que soit la durée du forfait initial. Les intérêts et la commission du garant identifié sont recalculés sur le solde au début de cette échéance, comme dans le fonctionnement mensuel. Le compte INCONNU représentant KARA ne génère aucune commission externe.

**Arrêt des intérêts : un mois calendaire après le départ du calendrier**, calculé depuis la première échéance moins la durée initiale du forfait. Les échéances datées à partir de cette limite sont en partie fixe, sans nouveaux intérêts ni nouvelles commissions. Les dates de fin de mois sont ramenées au dernier jour du mois suivant. Le solde continue d’être remboursé chaque semaine. Les intérêts déjà générés avant la limite restent dus.

Exemple : départ le 1er janvier, forfait de deux semaines, 100 000 FCFA à 10 %.

| Échéance | Date | Capital au début | Intérêts | Versé | Solde après versement |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | 15 janvier | 100 000 | 10 000 | 60 000 | 50 000 |
| 2 | 22 janvier | 50 000 | 5 000 | 30 000 | 25 000 |
| 3 | 29 janvier | 25 000 | 2 500 | 2 500 | 25 000 |
| 4, partie fixe | 5 février | 25 000 | 0 | 25 000 | 0 |

Les versements sont imputés aux intérêts de leur échéance puis au capital. Plusieurs versements rattachés à la même échéance ne paient pas une seconde fois les mêmes intérêts et conservent des identifiants distincts.

Le bouton **Modifier** utilise le même formulaire que le mensuel : date, heure, montant, mode, commentaire, preuve facultative et motif obligatoire. Sur un contrat en cours, une correction financière recalcule les parts de capital et d’intérêts des versements concernés, le total encaissé, le solde et la prochaine échéance enregistrés sur le contrat. Les anciens reçus concernés sont invalidés pour être régénérés. Une correction qui rendrait un versement suivant supérieur au solde de son échéance est refusée avant écriture : il faut d’abord corriger le versement suivant. Un montant corrigé à zéro reste une déclaration explicite à zéro. Un remboursement intégral après correction solde le contrat ; les contrats déjà soldés ou terminés restent verrouillés, comme dans le mensuel.

La tolérance de trois jours, l’échéance glissante des pénalités et leur formule existante (intérêts de l’échéance × jours de retard ÷ 30) sont conservées. Seules les dates de référence sont adaptées aux semaines. Aucun nouveau barème de pénalités n’est introduit.

Les contrats déjà terminés sous l’ancien forfait restent interprétés selon l’ancien intérêt unique. Les nouveaux contrats, et les contrats hebdomadaires en cours lors d’un nouvel enregistrement ou d’une correction de paiement, conservent explicitement le modèle `DEGRESSIVE`, pour que leur historique reste cohérent après clôture. Aucun versement ancien n’est réécrit automatiquement en base.

Les calendriers et bilans utilisent le même historique que la fiche admin. Les intérêts hebdomadaires sont regroupés par mois dans le bilan, sans compter le capital comme un revenu. Le portail membre suit les soldes et dates enregistrés par l’administration. L’aide et les documents contractuels décrivent la première échéance puis le suivi hebdomadaire.
