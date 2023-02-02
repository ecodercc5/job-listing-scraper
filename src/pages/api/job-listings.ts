// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { CheerioAPI, Element, load } from "cheerio";

type Data = any;

interface IJobPosting {
  id: string;
  position: string;
  link: string;
  jobCategories: {
    location: string;
    department: string;
    workplaceType: string;
  };
}

const getPostingsFromPostingGroup = (
  $: CheerioAPI,
  postingGroupElement: Element
): IJobPosting[] => {
  const postings = $(postingGroupElement)
    .find(".posting")
    .map((j, posting) => {
      const postingEl = $(posting);
      const id = postingEl.attr("data-qa-posting-id") as string;
      const position = postingEl.find(`h5[data-qa="posting-name"]`).text();

      const link = postingEl.find(`a.posting-title`).attr("href") as string;

      const jobCategories = postingEl.find(".posting-categories");
      const [location, department, workplaceType] = jobCategories
        .children("span")
        .map((_, cat) => $(cat).text())
        .toArray();

      const jobPosting: IJobPosting = {
        id,
        position,
        link,
        jobCategories: { location, department, workplaceType },
      };

      return jobPosting;
    })
    .toArray();

  return postings;
};

const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === "GET") {
    console.log("[getting job listings]");

    // job listing url -> has to be lever : no validation rn
    const url = req.query.url as string;

    console.log({ url });

    // fetch html
    const html = await axios
      .get(url, {
        headers: {
          "User-Agent": userAgent,
        },
      })
      .then((res) => {
        // console.log(res.config);

        return res;
      })
      .then((res) => res.data);

    // load html into cheerio
    const $ = load(html);

    // scrape job data
    const postingGroups = $(".postings-group")
      .map((i, el) => getPostingsFromPostingGroup($, el))
      .toArray();

    // flattent
    const postings = postingGroups.flat();

    return res.json({ data: postings });
  }

  return res.status(404).send("Not Found");
}
