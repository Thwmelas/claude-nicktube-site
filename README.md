# Nikos Panagiotopoulos — Portfolio

Site χτισμένο με [Astro](https://astro.build). Χρειάζεται Node.js 22.12 ή νεότερο.

## Τοπική εκτέλεση

```sh
npm install      # μόνο την πρώτη φορά
npm run dev      # ανοίξτε http://localhost:4321 στον browser
```

Το `npm run build` φτιάχνει το τελικό site στον φάκελο `dist/` και το `npm run preview` το σερβίρει τοπικά.

## Νέο editorial

1. Φτιάξτε φάκελο στο `src/editorials/`, π.χ. `src/editorials/summer-light/`.
   Το όνομα του φακέλου γίνεται το link (`#editorial-summer-light`).
2. Βάλτε μέσα τις φωτογραφίες (jpg, png, webp, avif). Εμφανίζονται με τη σειρά
   του ονόματος αρχείου, οπότε ονομάστε τες `01.jpg`, `02.jpg`, …
3. Προσθέστε ένα `editorial.json`:

   ```json
   {
     "title": "Summer Light",
     "cover": "01.jpg",
     "description": "Fashion story",
     "order": 2
   }
   ```

   - `title` (υποχρεωτικό): ο τίτλος στην αρχική και στη γκαλερί.
   - `cover` (υποχρεωτικό): ποια φωτογραφία του φακέλου είναι το εξώφυλλο στην αρχική (κόβεται σε αναλογία 3:4).
   - `description` (προαιρετικό): εμφανίζεται κάτω από τον τίτλο στη γκαλερί και στη λίστα της σελίδας Magazines.
   - `text` (προαιρετικό): μια παράγραφος πάνω από τις φωτογραφίες της γκαλερί.
   - `order` (προαιρετικό): σειρά στην αρχική (μικρότερο νούμερο = πιο πάνω).

Οι φωτογραφίες εμφανίζονται όπως είναι τα αρχεία (έγχρωμες ή ασπρόμαυρες).

## Δομή

```
src/
  editorials/<slug>/      φωτογραφίες + editorial.json για κάθε editorial
  lib/editorials.ts       διαβάζει τους φακέλους των editorials
  layouts/Layout.astro    <head> και <body>
  pages/index.astro       η σελίδα (μενού, αρχική, Magazines, Contact, γκαλερί)
  styles/global.css       τα στυλ του αρχικού προτύπου, αυτούσια
```
