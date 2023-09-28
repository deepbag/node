const User = require("../schema/user.schema");

module.exports.getUsersWithPostCount = async (req, res) => {
  try {
    //TODO: Implement this API
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page) ?? 1;
    limit = parseInt(limit) ?? 10;

    var pipeline = [
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "userId",
          as: "posts",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          posts: { $size: "$posts" },
        },
      },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          pagination: [{ $count: "totalDocs" }],
        },
      },
      {
        $unwind: "$pagination",
      },
      {
        $addFields: {
          "pagination.limit": limit,
          "pagination.page": page,
          "pagination.totalPages": {
            $ceil: {
              $divide: ["$pagination.totalDocs", limit],
            },
          },
          "pagination.pagingCounter": {
            $add: [{ $multiply: [{ $subtract: [page, 1] }, limit] }, 1],
          },
          "pagination.hasPrevPage": { $gt: [page, 1] },
          "pagination.hasNextPage": {
            $lt: [
              page,
              {
                $ceil: {
                  $divide: ["$pagination.totalDocs", limit],
                },
              },
            ],
          },
          "pagination.prevPage": {
            $cond: {
              if: { $gt: [page, 1] },
              then: { $subtract: [page, 1] },
              else: null,
            },
          },
          "pagination.nextPage": {
            $cond: {
              if: {
                $lt: [
                  page,
                  {
                    $ceil: {
                      $divide: ["$pagination.totalDocs", limit],
                    },
                  },
                ],
              },
              then: { $add: [page, 1] },
              else: null,
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          users: { $first: "$data" },
          pagination: { $push: "$pagination" },
        },
      },
      {
        $project: {
          _id: 0,
          users: 1,
          pagination: { $arrayElemAt: ["$pagination", 0] },
        },
      },
    ];
    const _d = await User.aggregate(pipeline);

    return res.status(200).json({ data: _d[0] ?? {} });
  } catch (error) {
    res.send({ error: error.message });
  }
};
