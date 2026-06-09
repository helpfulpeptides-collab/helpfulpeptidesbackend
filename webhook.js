// api/webhook.js
// Stripe webhook handler — receives events when payments succeed, subscriptions cancel, etc.
// Set this URL in Stripe Dashboard → Developers → Webhooks

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Disable body parsing — Stripe needs the raw body to verify signature
export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const sig     = req.headers['stripe-signature'];
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('✅ Payment successful:', session.id, 'Customer:', session.customer_email);
      // TODO: Provision access for session.customer_email
      // e.g. add to database, send welcome email via SendGrid, etc.
      break;
    }

    case 'customer.subscription.created': {
      const sub = event.data.object;
      console.log('🔔 Subscription created:', sub.id, 'Status:', sub.status);
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object;
      console.log('⏰ Trial ending soon:', sub.id, 'Ends:', new Date(sub.trial_end * 1000));
      // TODO: Send reminder email
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      console.log('❌ Subscription cancelled:', sub.id);
      // TODO: Revoke access
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.log('💳 Payment failed:', invoice.id, 'Customer:', invoice.customer_email);
      // TODO: Send dunning email
      break;
    }

    default:
      console.log('Unhandled event type:', event.type);
  }

  res.status(200).json({ received: true });
};
