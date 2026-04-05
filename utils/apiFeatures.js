export class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'cursor'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Advanced filtering (e.g., gte, gt, lte, lt)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      // Default sorting by newly created
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    if (this.paginationMode === 'cursor') return this; // Skip manual pagination if cursor is set
    
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  cursor() {
    if (this.queryString.cursor) {
      // Decode cursor (base64 string to query)
      try {
        const decodedString = Buffer.from(this.queryString.cursor, 'base64').toString('ascii');
        const dbCursor = JSON.parse(decodedString);
        // Simple implementation: Assumes sorting by _id (if we sorted by something else, the cursor object would hold more fields)
        if (dbCursor._id) {
            this.query = this.query.find({ _id: { $lt: dbCursor._id } }); // Less than for descending sort
        }
        this.paginationMode = 'cursor';
      } catch (err) {
        console.warn('Invalid cursor format received:', err);
      }
    }
    
    // Always limit when using cursors
    if (this.queryString.cursor || this.queryString.limit) {
      const limit = this.queryString.limit * 1 || 10;
      this.query = this.query.limit(limit);
      this.paginationMode = 'cursor';
    }
    
    return this;
  }
}
