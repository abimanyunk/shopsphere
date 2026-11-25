import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Everyday essentials, thoughtfully selected</p>
          <h1>
            Find your next
            <br />
            <em>favorite thing.</em>
          </h1>
          <p>
            Discover quality products across technology, home, and lifestyle—with a shopping
            experience designed to feel effortless.
          </p>
          <div className="button-row">
            <Link className="button button-primary" to="/products">
              Shop the collection
            </Link>
            <a className="button button-secondary" href="#promise">
              Why ShopSphere?
            </a>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <span>SS</span>
        </div>
      </section>
      <section className="promise-grid" id="promise">
        <article>
          <span>01</span>
          <h2>Curated catalogue</h2>
          <p>A focused collection with clear stock and pricing information.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Secure by design</h2>
          <p>Session-based authentication and protected account actions.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Simple checkout</h2>
          <p>A transparent simulated payment flow with instant order history.</p>
        </article>
      </section>
      <section className="cta-band">
        <p className="eyebrow">Ready when you are</p>
        <h2>Good things are waiting.</h2>
        <Link to="/products">Browse all products →</Link>
      </section>
    </main>
  );
}
