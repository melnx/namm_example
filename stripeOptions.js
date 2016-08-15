module.exports = {
    apiKey: process.env.STRIPE_KEY || '',
    stripePubKey: process.env.STRIPE_PUB_KEY || '',
    defaultPlan: 'free',
    plans: ['free', 'silver', 'gold', 'platinum'],
    planData: {
        'free': {
            name: 'Free',
            price: 0,
            $limit: ['Campaign', 0]
        },
        'silver': {
            name: 'Silver',
            price: 9,
            $limit: ['Campaign', 10]
        },
        'gold': {
            name: 'Gold',
            price: 19,
            $limit: ['Campaign', 20]
        },
        'platinum': {
            name: 'Platinum',
            price: 29,
            $limit: ['Campaign', 30]
        }
    }
};
