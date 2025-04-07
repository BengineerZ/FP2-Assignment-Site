import argparse
import pandas as pd


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Clean price difference data")
    parser.add_argument(
        "--data_dir",
        type=str,
        default="input",
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
    df = pd.read_csv(f"{data_dir}/mapc_region_residential_sales.csv")
    
    print(f"Data loaded from {data_dir}/mapc_region_residential_sales.csv")
    print(f"Data shape: {df.shape}.")
    # print columns
    print(f"Columns: {df.columns.tolist()}")
    print("Dropping usecodes over 200.")

    # drop columns that have UseCode field greater than 200
    df = df[df["usecode"] <= 200]
    print(f"Data shape: {df.shape}. Dropping null values.")
    # drop rows with null values
    df = df.dropna()
    print(f"Data shape: {df.shape}. Dropping duplicates.")
    # drop duplicates
    df = df.drop_duplicates()
    print(f"Data shape: {df.shape}. Dropping rows with no price, or dummy prices.")
    # drop rows with no price or $10 dummy prices
    df = df[df["price"] > 10]
    # save into output directory
    df.to_csv(f"{output_dir}/mapc_region_residential_sales_clean.csv", index=False)
    print(f"Data saved to {output_dir}/mapc_region_residential_sales_clean.csv")
    print(f"Data shape: {df.shape}.")




    