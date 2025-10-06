import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import Navbar from '@/components/Navbar';

export default function Welcome() {
  const { auth } = usePage<SharedData>().props;

  return (
    <>
      <Head title="Welcome" />

      {/* Move link tags outside of Head */}
      <link rel="preconnect" href="https://fonts.bunny.net" />
      <link
        href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600"
        rel="stylesheet"
      />

      <Navbar user={auth?.user} />

      <div style={{ backgroundColor: 'white', padding: '2rem' }}>
        <h1>Welcome to the Financial App</h1>
      </div>
    </>
  );
}