import { redirect } from '@sveltejs/kit';

export function load({ params }: { params: { piece: string } }) {
  const { piece } = params;

  if (piece === 'blindfold') {
    redirect(301, '/vision');
  }

  if (piece.startsWith('blindfold-')) {
    redirect(301, `/vision/${piece.replace('blindfold-', '')}`);
  }
}
