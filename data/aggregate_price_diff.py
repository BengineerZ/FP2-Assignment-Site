import argparse
import pandas as pd


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Clean price difference data")
    parser.add_argument(
        "--data_dir",
        type=str,
        default="processed",
        help="Directory where the data is stored",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="processed",
        help="Directory where the cleaned data will be saved",
    )
    args = parser.parse_args()
    data_dir = args.data_dir
    output_dir = args.output_dir
    
    # Read the data
    df = pd.read_csv(f"{data_dir}/mapc_region_residential_sales_clean.csv")
    
    # Make new field that groups Investor Type Purchase field into 2 categories
    # 1 = Yes, sold by an investor, 0 = No, not sold by an investor
    df["investor_sold"] = df["investor_type_sale"].apply(
        lambda x: 1 if x == "Small" or x == "Large" or x == "Institutional" or x == "Medium" else 0
    )
    # print unique fields from investor_sold
    print(f"Unique values in investor_sold: {df['investor_sold'].unique()}")
    print(f"Unique values in investor_type_sale: {df['investor_type_sale'].unique()}")
    # total number of rows that are investor sold
    print(f"Total number of rows that are investor sold: {df['investor_sold'].sum()}")
    # total number of rows that are not investor sold
    print(f"Total number of rows that are not investor sold: {df['investor_sold'].count() - df['investor_sold'].sum()}")

    # Only keep the columns we need
    df = df[
        [
            "price_diff",
            "investor_sold",
            "year"
        ]
    ]

    # Compute sum of price differences by year and investor type
    # df = df.groupby(["year", "investor_sold"]).mean().reset_index()


    # Compute mean price differences by year and investor type
    grouped = df.groupby(["year", "investor_sold"])["price_diff"].mean().reset_index()

    # Pivot the table to get one row per year and two columns for investor/non-investor
    pivoted = grouped.pivot(index="year", columns="investor_sold", values="price_diff").reset_index()

    # Rename columns for clarity
    # pivoted.columns = ["year", "non_investor_price_diff_mean", "investor_price_diff_mean"]
    pivoted.columns = ["year", "noninvestor profit", "total investor profit"]


    # add row for difference between investor and non investor
    pivoted["mean profit diff"] = pivoted["total investor profit"] - pivoted["noninvestor profit"]

    # Save the data
    pivoted.to_csv(f"{output_dir}/mapc_region_residential_sales_clean_aggregated.csv", index=False)
    print(f"Data saved to {output_dir}/mapc_region_residential_sales_clean_aggregated.csv")
    print(f"Data shape: {pivoted.shape}.")


"""
    # Save the data
    df.to_csv(f"{output_dir}/mapc_region_residential_sales_clean_aggregated.csv", index=False)
    print(f"Data saved to {output_dir}/mapc_region_residential_sales_clean_aggregated.csv")
    print(f"Data shape: {df.shape}.")

"""


    