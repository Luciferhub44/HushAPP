const elasticsearch = require('@elastic/elasticsearch');
const client = new elasticsearch.Client({
  cloud: { id: process.env.ELASTIC_CLOUD_ID },
  auth: { apiKey: process.env.ELASTIC_API_KEY }
});

const searchService = {
  async searchArtisans(params) {
    const {
      query,
      location,
      radius,
      specialty,
      rating,
      availability,
      price_range,
      sort_by
    } = params;

    const searchBody = {
      bool: {
        must: [
          { term: { userType: 'artisan' } },
          query && {
            multi_match: {
              query,
              fields: ['specialty^3', 'bio', 'businessName^2']
            }
          }
        ].filter(Boolean),
        filter: [
          location && {
            geo_distance: {
              distance: `${radius}km`,
              'location.coordinates': location
            }
          },
          specialty && { term: { specialty } },
          rating && { range: { rating: { gte: rating } } },
          availability && { term: { 'availability': true } }
        ].filter(Boolean)
      }
    };

    return await client.search({
      index: 'artisans',
      body: searchBody,
      sort: getSortOptions(sort_by)
    });
  }
}; 