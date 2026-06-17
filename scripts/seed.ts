import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import categories from '../seeds/f1/sanitized/categories.sanitized.seed.ts';

initializeApp({
  credential: cert('./serviceAccountKey.json'),
});

const db = getFirestore();

async function main() {
  const categoriesCol = db.collection('categories');
  const snapshot = await categoriesCol.get();

  if (!snapshot.empty) {
    console.log('→ Já existem categorias, pulando');
    process.exit(0);
  }

  const batch = db.batch();

  for (const category of categories) {
    const docRef = categoriesCol.doc(category.id);
    batch.set(docRef, {
      ...category,
      createdAt: new Date(category.createdAt),
      updatedAt: new Date(category.updatedAt),
    });
  }

  await batch.commit();
  console.log(`✓ ${categories.length} categorias inseridas`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro ao inserir categorias:', err);
  process.exit(1);
});
