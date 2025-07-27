import { getPageMedia } from "@/provider/Anilist/index";
import {
  type MediaFormat,
  MediaFormat as MediaFormatEnum,
  // type MediaSeason,
  // MediaSeason as MediaSeasonEnum,
  type MediaSort,
  MediaSort as MediaSortEnum,
  type MediaStatus,
  MediaStatus as MediaStatusEnum,
  MediaType,
} from "@/types/anilist";
import useSWRInfinite from "swr/infinite";

export interface UseBrowseOptions {
  keyword?: string;
  genres?: string[];
  format?: MediaFormat | string;
  limit?: number;
  tags?: string[];
  sort?: MediaSort;
  country?: string;
  status?: MediaStatus | string;
  isAdult?: boolean;
  year?: number;
  seasonYear?: number;
  type?: string;
}

const getKey = (
  options: UseBrowseOptions,
  pageIndex: number,
  previousPageData: any,
) => {
  if (previousPageData && !previousPageData.media?.length) return null;
  return ["browse-manga", pageIndex + 1, options];
};

// Map frontend sort values to Anilist MediaSort
const mapSortToMediaSort = (sort: string): MediaSort => {
  switch (sort) {
    case "latest":
      return MediaSortEnum.Updated_at_desc;
    case "name_asc":
      return MediaSortEnum.Title_romaji;
    case "name_desc":
      return MediaSortEnum.Title_romaji_desc;
    case "score":
      return MediaSortEnum.Score_desc;
    case "popularity":
      return MediaSortEnum.Popularity_desc;
    default:
      return MediaSortEnum.Popularity;
  }
};

// Map frontend type values to Anilist MediaFormat
const mapTypeToMediaFormat = (type: string): MediaFormat | undefined => {
  switch (type) {
    case "manga":
      return MediaFormatEnum.Manga;
    case "novel":
      return MediaFormatEnum.Novel;
    case "one_shot":
      return MediaFormatEnum.One_shot;
    default:
      return undefined;
  }
};

const mapStatusToMediaStatus = (status: string): MediaStatus | undefined => {
  switch (status) {
    case "completed":
      return MediaStatusEnum.Finished;
    case "releasing":
      return MediaStatusEnum.Releasing;
    case "cancelled":
      return MediaStatusEnum.Cancelled;
    case "hiatus":
      return MediaStatusEnum.Hiatus;
    case "not_yet_released":
      return MediaStatusEnum.Not_yet_released;
  }
  return undefined;
};

const mapCountryToMediaCountry = (country: string): string | undefined => {
  switch (country) {
    case "jp":
      return "JP";
    case "kr":
      return "KR";
    case "cn":
      return "CN";
    case "tw":
      return "TW";
  }
  return undefined;
};

const useBrowse = (options: UseBrowseOptions) => {


  const fetcher = async (key: [string, number, UseBrowseOptions]) => {
    const [_key, page, _options] = key;

    const {
      format,
      genres = [],
      keyword,
      sort,
      limit = 20,
      tags = [],
      country,
      status,
      isAdult,
      year,
      type,
    } = _options;


    try {
      const mappedSort = sort
        ? mapSortToMediaSort(sort)
        : MediaSortEnum.Popularity;
      
      // Handle format mapping - prioritize format if it's a string, otherwise use type
      let mappedFormat: MediaFormat | undefined;
      if (format && typeof format === 'string') {
        mappedFormat = mapTypeToMediaFormat(format);
      } else if (type) {
        mappedFormat = mapTypeToMediaFormat(type);
      } else {
        mappedFormat = format;
      }
      
      const mappedCountry = country ? mapCountryToMediaCountry(country) : undefined;
      
      // Handle status mapping - convert string to enum if needed
      let mappedStatus: MediaStatus | undefined;
      if (status && typeof status === 'string') {
        mappedStatus = mapStatusToMediaStatus(status);
      } else {
        mappedStatus = status as MediaStatus | undefined;
      }

      console.log("Fetching manga with options:", {
        type: MediaType.Manga,
        format: mappedFormat,
        perPage: limit,
        countryOfOrigin: mappedCountry,
        sort: [mappedSort],
        status: mappedStatus,
        year: year,
        page,
        ...(tags.length && { tag_in: tags }),
        ...(genres.length && { genre_in: genres }),
        ...(keyword && { search: keyword }),
        isAdult: isAdult || genres.includes("Hentai") || genres.includes("Ecchi"),
      });

      const result = await getPageMedia({
        type: MediaType.Manga,
        format: mappedFormat,
        perPage: limit,
        countryOfOrigin: mappedCountry,
        sort: [mappedSort],
        status: mappedStatus,
        year: year,
        page: page || 1,
        ...(tags.length && { tag_in: tags }),
        ...(genres.length && { genre_in: genres }),
        ...(keyword && { search: keyword }),
        isAdult:
          isAdult || genres.includes("Hentai") || genres.includes("Ecchi"),
      }
      );
      return result;
    } catch (error) {
      console.error("Error fetching manga from AniList:", error);
      throw error;
    }
  };

  const swr = useSWRInfinite(
    (pageIndex, previousPageData) =>
      getKey(options, pageIndex, previousPageData),
    fetcher,
    {
      revalidateFirstPage: false,
    },
  );

  return {
    ...swr,
    data: swr.data,
    fetchNextPage: () => swr.setSize(swr.size + 1),
    hasNextPage:
      swr.data?.[swr.data.length - 1]?.pageInfo?.hasNextPage ?? false,
    isLoading: swr.isLoading,
    isValidating: swr.isValidating,
  };
};

export default useBrowse;
