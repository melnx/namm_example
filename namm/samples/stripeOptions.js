module.exports = {
    apiKey: process.env.STRIPE_KEY || '',
    stripePubKey: process.env.STRIPE_PUB_KEY || '',
    defaultPlan: 'free',
    plans: ['free', 'silver', 'gold', 'platinum'],
    planData: {
        'free': {
            name: 'Free',
            price: 0,
            $limit: [{'Post': 1}, {'Comment': 10}]
        },
        'silver': {
            name: 'Silver',
            price: 9,
            $limit: [{'Post': 10}, {'Comment': 25}]
        },
        'gold': {
            name: 'Gold',
            price: 19,
            $limit: [{'Post': 20}, {'Comment': 50}]
        },
        'platinum': {
            name: 'Platinum',
            price: 29,
            $limit: [{'Post': 30}, {'Comment': 100}]
        }
    }
};
