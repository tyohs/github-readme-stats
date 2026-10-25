/** @jest-environment node */
import { expect, it, jest } from "@jest/globals";
import * as github from "@actions/github";

it("preserves REST pagination and GraphQL requests with the Actions client", async () => {
  const fetch = jest.fn(async (url) => {
    if (url.endsWith("/graphql")) {
      return Response.json({ data: { repository: { name: "example" } } });
    }
    return Response.json([{ id: 1, body: "existing comment" }]);
  });
  const client = github.getOctokit("test-only-token", { request: { fetch } });
  const pages = [];
  for await (const response of client.paginate.iterator(
    client.rest.issues.listComments,
    { owner: "example", repo: "example", issue_number: 1 },
  )) {
    pages.push(...response.data);
  }
  expect(pages).toEqual([{ id: 1, body: "existing comment" }]);
  expect(await client.graphql("{ repository { name } }")).toEqual({
    repository: { name: "example" },
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(github.context.payload).toBeDefined();
});

it("preserves HTTP error status for callers", async () => {
  const client = github.getOctokit("test-only-token", {
    request: {
      fetch: async () =>
        Response.json({ message: "Not Found" }, { status: 404 }),
    },
  });
  await expect(
    client.rest.pulls.get({
      owner: "example",
      repo: "example",
      pull_number: 1,
    }),
  ).rejects.toMatchObject({ status: 404 });
});
