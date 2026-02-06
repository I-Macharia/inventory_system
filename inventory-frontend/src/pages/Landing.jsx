export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-gray-800">

      {/* HERO */}
      <section className="bg-yellow-400 text-black py-24 px-6 text-center">
        <h1 className="text-5xl font-bold mb-4">Kenya’s Trusted Wholesale Toy Supplier</h1>
        <p className="text-xl max-w-3xl mx-auto mb-6">
          We supply supermarkets, toy shops and school stores across Kenya with
          affordable, fast-moving toys at true wholesale margins.
        </p>
        <a href="/login" className="bg-black text-white px-8 py-4 rounded-lg text-lg">
          Retailer Login
        </a>
      </section>

      {/* IMAGES */}
      <section className="grid md:grid-cols-2 gap-6 p-8">
        <img src="https://images.unsplash.com/photo-1588072432836-e10032774350" className="rounded-xl shadow-lg"/>
        <img src="https://images.unsplash.com/photo-1606813902527-0b6f2eac5f2d" className="rounded-xl shadow-lg"/>
      </section>

      {/* VALUE */}
      <section className="bg-gray-100 py-20 px-6">
        <h2 className="text-3xl font-bold text-center mb-12">Built for Retail Growth</h2>
        <div className="grid md:grid-cols-3 gap-10 text-center max-w-6xl mx-auto">
          <div>
            <h3 className="font-bold text-xl mb-2">Wholesale Pricing</h3>
            <p>Structured for reseller margins and bulk restocking.</p>
          </div>
          <div>
            <h3 className="font-bold text-xl mb-2">Educational Toys</h3>
            <p>High-demand learning and STEM toys for school-age children.</p>
          </div>
          <div>
            <h3 className="font-bold text-xl mb-2">Consignment Supply</h3>
            <p>Stock large chains now and reconcile sales digitally.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black text-white py-24 text-center">
        <h2 className="text-4xl font-bold mb-4">Supply That Scales With You</h2>
        <p className="mb-6 text-lg">Digital invoices • Stock tracking • Scheduled restocking</p>
        <a href="/Registration" className="bg-yellow-400 text-black px-10 py-4 rounded-lg text-xl">
          Request Wholesale Access
        </a>
      </section>

    </div>
  );
}
